// ──────────────────────────────
// [1] Settings, Config & Modules
// ──────────────────────────────

var Config        = require('users/alirezaali/UC4D:01 Configurations')                                            ;

var FeatureLib    = require('users/alirezaali/UC4D:04 Multi-Source Feature Library')                              ;

var Visualization = Config.Visualization                                                                          ;

var LCZColors     = ee.List( Visualization.LCZPalette )                                                           ;

var LetterToNum   = ee.Dictionary({ 'A' : 11 , 'B' : 12 , 'C' : 13 , 'D' : 14 , 'E' : 15 , 'F' : 16 , 'G' : 17 }) ;

// ─────────────────
// [2] Configuration
// ─────────────────

// [2.1] Spatial

var AssetRoot    = Config.AssetRoot                            ;

var TargetCities = Config.PrimaryTargets                       ;

var DriveFolder  = 'UC4D/LCZ-TIRPs'                            ;

var Scale        = 10                                          ;

var MaxPixels    = 1e13                                        ;

var TileScale    = 4                                           ;

// [2.2] Temporal Window

var PersistYears = [ 2020 , 2021 , 2022 , 2023 , 2024 , 2025 ] ;

// [2.3] Feature Library Utilities

var QABand            = FeatureLib.QABand                      ;

var ClearThreshold    = FeatureLib.ClearThreshold              ;

var SpectralIndicesFn = FeatureLib.SpectralIndicesFunction     ;

var csPlus            = FeatureLib.csPlus                      ;

// ──────────────────
// [3] Spatial Inputs
// ──────────────────

// [3.1] TIRPs (Temporally-Invariant Reference Polygons)

var ConvertLCZ = function( F ) {

  var Str    = ee.String( F.get( 'LCZID' ) );

  var Suffix = Str.slice( 3 );

  var Num    = ee.Algorithms.If(

    Suffix.match( '\\d' ).length().gt( 0 ) ,
    
    ee.Number.parse( Suffix )              ,

    ee.Dictionary({ A : 11 , B : 12 , C : 13 , D : 14 , E : 15 , F : 16 , G : 17 }).get( Suffix )

  ) ;

return F.set( 'LCZClass' , ee.Number( Num ) )  ;

} ;

var StyleByLCZ = function( FC ) {

  return FC.map( function( Feat ) {

    var Raw        = ee.String( Feat.get( 'LCZID' ) )                                                                                                   ;

    var Code       = Raw.replace( 'LCZ' , '' ).replace( ' ' , '' , 'g' ).trim()                                                                         ;

    var Num        = ee.Number.parse( Code )                                                                                                            ;

    var IsLetter   = ee.Number( LetterToNum.contains( Code ) )                                                                                          ;

    var IsNumValid = ee.Number( Num.gte( 1 ).and( Num.lte( 17 ) ) )                                                                                     ;

    var ClassNum   = ee.Algorithms.If( IsLetter , LetterToNum.get( Code ) , ee.Algorithms.If( IsNumValid , Num , 0 ) )                                  ;

    ClassNum       = ee.Number( ClassNum ).int()                                                                                                        ;

    var Color      = ee.String( ee.Algorithms.If( ClassNum.gte( 1 ).and( ClassNum.lte( 17 ) ) , LCZColors.get( ClassNum.subtract( 1 ) ) , '#AAAAAA' ) ) ;

    return Feat.set( 'style' , { color : Color , fillColor : Color , width : 1 } )                                                                      ;

  } ) ;

} ;

var LCZPolys = {} ;

TargetCities.forEach( function( CityName ) {

  var CityTIRPs        = ee.FeatureCollection( AssetRoot + '/Samples/LCZ/' + CityName ).map( ConvertLCZ )             ;

  LCZPolys[ CityName ] = CityTIRPs                                                                                    ;

  Map.addLayer( StyleByLCZ( CityTIRPs ).style({ styleProperty : 'style' }) , {} , CityName + ' LCZ Samples' , false ) ;

} ) ;

// [3.2] Static Reference Layers

var GLO30      = ee.ImageCollection( 'COPERNICUS/DEM/GLO30' ) ;

var NativeProj = GLO30.first().projection()                   ;

var DEM        = ee.ImageCollection( 'projects/sat-io/open-datasets/FABDEM' )

                     .mosaic()

                     .setDefaultProjection( NativeProj )

                     .rename( 'elevation' ) ;

var Slope    = ee.Terrain.slope( DEM ).rename( 'slope' ) ;

var SVFImage = function( CityName ) {

  return ee.Image( AssetRoot + '/3D-UM/' + CityName + '/' + CityName + '-3D' ).select( 'SVF' ) ;

} ;

// ─────────────────────
// [4] Annual Composites
// ─────────────────────

// [4.1] Sentinel-2 (per BandName)

var GetAnnualComposite = function( Domain , Year , BandName ) {

  var Start = ee.Date.fromYMD( Year , 1 , 1 )   ;

  var End   = ee.Date.fromYMD( Year , 12 , 31 ) ;

  var S2    = ee.ImageCollection( 'COPERNICUS/S2_SR_HARMONIZED' )

                      .filterBounds( Domain )
                      
                      .filterDate( Start , End )
                      
                      .linkCollection( csPlus , [ QABand ] )
                      
                      .map( function( Img ) { return Img.updateMask( Img.select( QABand ).gte( ClearThreshold ) ) ; } )
      
                      .map( SpectralIndicesFn )
      
                      .select( BandName ).mean()     ;

  return S2.rename( BandName ).set( 'Year' , Year )  ;

} ;

// [4.2] Sentinel-2 Annual Stack

var BuildAnnualS2 = function( Domain , BandName ) {

  return ee.ImageCollection.fromImages(

    PersistYears.map( function( Y ) {

return GetAnnualComposite( Domain , Y , BandName )  ;

    })

  ) ;

} ;

// [4.3] Sentinel-1 Annual Stack

var BuildAnnualSAR = function( Domain ) {

  return ee.ImageCollection.fromImages(

    PersistYears.map( function( Y ) {

      var Yr = ee.Number( Y ).int();

      var S1 = ee.ImageCollection( 'COPERNICUS/S1_GRD' )

              .filterBounds( Domain )

              .filter( ee.Filter.eq( 'instrumentMode' , 'IW' ) )

              .filter( ee.Filter.listContains( 'transmitterReceiverPolarisation' , 'VV' ) )

              .filter( ee.Filter.listContains( 'transmitterReceiverPolarisation' , 'VH' ) )

              .filterDate( ee.Date.fromYMD( Yr , 1 , 1 ) , ee.Date.fromYMD( Yr , 12 , 31 ) )

              .select( 'VV' )

              .map( function( Img ) { return ee.Image( 10.0 ).pow( Img.divide( 10.0 ) ).rename( 'VV_power' ) ; } )

              .mean() ;

  return S1.set( 'Year' , Yr ).rename( 'VV_power' )  ;

    })

  ) ;

} ;

// ────────────────────────
// [5] Per-Class Statistics
// ────────────────────────

// [5.1] Class Label Formatter (1 → 'LCZ1' , 11 → 'LCZA')

var LCZLabel = function( Cls ) {

  Cls        = ee.Number( Cls );

  var Suffix = ee.Algorithms.If(

    Cls.lte( 10 ) , Cls.format( '%d' ) ,

    ee.String( ee.List([ 'A' , 'B' , 'C' , 'D' , 'E' , 'F' , 'G' ]).get( Cls.subtract( 11 ) ) )

  ) ;

  return ee.String( 'LCZ' ).cat( ee.String( Suffix ) ) ;

} ;

// [5.2] One Row Per Class

var ComputeClassStats = function( CityPolys , ClassValue , SVFImg , CVStack ) {

  var ClassPolys   = CityPolys.filter( ee.Filter.eq( 'LCZClass' , ClassValue ) ) ;

  var PolygonCount = ClassPolys.size()                                           ;

  var ClassGeom    = ClassPolys.geometry()                                       ;

  // [5.2.1] Area (ha)

  var AreaImage = ee.Image.pixelArea().divide( 1e4 );

  var AreaDict  = AreaImage.reduceRegion({

    reducer   : ee.Reducer.sum() ,

    geometry  : ClassGeom        ,

    scale     : Scale            ,

    maxPixels : MaxPixels        ,

    tileScale : TileScale

  }) ;

  var TotalAreaHa     = ee.Number( AreaDict.get( 'area' ) )                      ;

  var MeanAreaHa      = TotalAreaHa.divide( ee.Number( PolygonCount ).max( 1 ) ) ;

  var TotalPixelCount = TotalAreaHa.multiply( 100 ).round()                      ;

  // [5.2.2] Elevation (m)

  var ElevDict = DEM.reduceRegion({

    reducer   : ee.Reducer.minMax() ,

    geometry  : ClassGeom           ,

    scale     : 30                  ,

    maxPixels : MaxPixels           ,

    tileScale : TileScale

  }) ;

  var ElevMin = ee.Number( ElevDict.get( 'elevation_min' , -9999 ) ) ;

  var ElevMax = ee.Number( ElevDict.get( 'elevation_max' , -9999 ) ) ;

  // [5.2.3] Slope (Degrees)

  var SlopeDict = Slope.reduceRegion({

    reducer   : ee.Reducer.minMax() ,

    geometry  : ClassGeom           ,

    scale     : 30                  ,

    maxPixels : MaxPixels           ,

    tileScale : TileScale

  }) ;

  var SlopeMin = ee.Number( SlopeDict.get( 'slope_min' , -9999 ) ) ;

  var SlopeMax = ee.Number( SlopeDict.get( 'slope_max' , -9999 ) ) ;

  // [5.2.4] Sky View Factor

  var SVFDict = SVFImg.reduceRegion({

    reducer   : ee.Reducer.minMax().combine( ee.Reducer.mean() , '' , true ) ,

    geometry  : ClassGeom                                                    ,

    scale     : Scale                                                        ,

    maxPixels : MaxPixels                                                    ,

    tileScale : TileScale

  }) ;

  var SVFMin  = ee.Number( SVFDict.get( 'SVF_min' , -9999 ) )  ;

  var SVFMax  = ee.Number( SVFDict.get( 'SVF_max' , -9999 ) )  ;

  var SVFMean = ee.Number( SVFDict.get( 'SVF_mean' , -9999 ) ) ;

  // [5.2.5] Inter-Annual Coefficients of Variation

  var CvDict = CVStack.reduceRegion({

    reducer   : ee.Reducer.mean() ,

    geometry  : ClassGeom         ,

    scale     : 100               ,

    maxPixels : MaxPixels         ,

    tileScale : TileScale

  }) ;

return ee.Feature( null , {

    'LCZClass'        : LCZLabel( ClassValue )                        ,

    'NumPolygons'     : PolygonCount                                  ,

    'TotalPixelCount' : TotalPixelCount                               ,

    'TotalAreaHa'     : TotalAreaHa                                   ,

    'MeanAreaHa'      : MeanAreaHa                                    ,

    'ElevMin'         : ElevMin                                       ,

    'ElevMax'         : ElevMax                                       ,

    'SlopeMin'        : SlopeMin                                      ,

    'SlopeMax'        : SlopeMax                                      ,

    'SVFMin'          : SVFMin                                        ,

    'SVFMax'          : SVFMax                                        ,

    'SVFMean'         : SVFMean                                       ,

    'AlbedoCV'        : ee.Number( CvDict.get( 'AlbedoCV' , -9999 ) ) ,

    'NDVICV'          : ee.Number( CvDict.get( 'NDVICV' , -9999 ) )   ,

    'VVCV'            : ee.Number( CvDict.get( 'VVCV' , -9999 ) )

  }) ;

} ;

// ──────────────────────
// [6] Export & Execution
// ──────────────────────

var ExportCityStats = function( CityName ) {

    var CityPolys = LCZPolys[ CityName ] ;
  
    var PolysGeom = CityPolys.geometry() ;
  
    // [6.1] Build Annual Stacks
  
    var AnnualAlbedo = BuildAnnualS2( PolysGeom , 'Albedo' ) ;
  
    var AnnualNDVI   = BuildAnnualS2( PolysGeom , 'NDVI' )   ;
  
    var AnnualVV     = BuildAnnualSAR( PolysGeom )           ;
  
    // [6.2] Stack the Three Coefficients of Variation Into One Image
  
    var AlbedoCVImg = AnnualAlbedo.reduce( ee.Reducer.stdDev() ).divide( AnnualAlbedo.mean() ).rename( 'AlbedoCV' ) ;
  
    var NDVICVImg   = AnnualNDVI  .reduce( ee.Reducer.stdDev() ).divide( AnnualNDVI  .mean() ).rename( 'NDVICV'   ) ;
  
    var VVCVImg     = AnnualVV    .reduce( ee.Reducer.stdDev() ).divide( AnnualVV    .mean() ).rename( 'VVCV'     ) ;
  
    var CVStack     = AlbedoCVImg.addBands( NDVICVImg ).addBands( VVCVImg )                                         ;
  
    // [6.3] Static SVF Reference
  
    var SVFImg = SVFImage( CityName );
  
    // [6.4] Per-Class Reduction Loop
  
    var Stats = ee.List.sequence( 1 , 17 ).map( function( Cls ) {

  return ComputeClassStats( CityPolys , Cls , SVFImg , CVStack )  ;

  }) ;

  var StatsFC = ee.FeatureCollection( Stats ).filter( ee.Filter.neq( 'NumPolygons' , 0 ) ) ;

  // [6.5] CSV Export

  Export.table.toDrive({

    collection     : StatsFC                 ,

    description    : CityName + '-LCZ-Stats' ,

    folder         : DriveFolder             ,

    fileNamePrefix : CityName + '-LCZ-Stats' ,

    fileFormat     : 'CSV'                   ,

    selectors      : [ 'LCZClass' , 'NumPolygons' , 'TotalPixelCount' , 'TotalAreaHa' , 'MeanAreaHa' , 'ElevMin' , 'ElevMax' , 'SlopeMin' , 'SlopeMax' , 'SVFMin' , 'SVFMax' , 'SVFMean' , 'AlbedoCV' , 'NDVICV' , 'VVCV' ]

  }) ;

} ;

// ───────
// [7] Run
// ───────

TargetCities.forEach( ExportCityStats ) ;

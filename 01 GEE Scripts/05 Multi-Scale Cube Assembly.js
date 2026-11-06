// —————————————————————————————————————
// [1] Initialization & Global Constants
// —————————————————————————————————————

var Switch = { FINPStatic : false , CORPStatic : false , LCZP : false , LCZPGLCM : false , FINPDynamic : false , CORPDynamic : false };

var Config            = require('users/alirezaali/UC4D:01 Configurations')                                          ;

var FeatureLib        = require('users/alirezaali/UC4D:04 Multi-Source Feature Library')                            ;

var AssetBasePath     = Config.AssetRoot + '/STC'                                                                   ;

var ScaleCube         = Config.ScaleCube                                                                            ;
 
var VIIRSCRSTransform = Config.VIIRSCRSTransform                                                                    ;

var VIIRSCRS          = Config.VIIRSCRS                                                                             ;

var StaticBands       = [ 'Elevation' , 'Slope' , 'Northness' , 'Eastness' , 'BH' , 'SVF' , 'BCR' , 'FAI' , 'SDH' ] ;

var MaxPixels         = Config.MaxPixels                                                                            ;

var TileScale         = Config.TileScale                                                                            ;

var FineResolution    = Config.TargetResolution                                                                     ;

var SafetyBuffer      = 250                                                                                         ;

var CoarseningScale   = 75                                                                                          ; 

// ————————————————————————————————
// [2] Domain & City Metadata Setup
// ————————————————————————————————

var TargetCities = Config.PrimaryTargets                          ;

var DefaultLCZYears = [ 2020 , 2021 , 2022 , 2023 , 2024 , 2025 ] ;

var BuildCityMetadata = function(CityName) {

var CompleteDomain   = Config[CityName + 'CompleteDomain']        ;

  return {

    Name         : CityName                                       ,

    Seasons      : Config[CityName + 'Seasons']                   ,

    FINPDomain   : Config[CityName + 'SUHIDomain']                ,

    CORPDomain   : CompleteDomain.geometry()                      ,

    LCZDomain    : Config[CityName + 'LCZDomain']                 ,

    LCZYears     : DefaultLCZYears                                ,

    UTM          : Config.CityCRS[CityName]

  } ;

} ;

var Cities = TargetCities.map(BuildCityMetadata) ;

// ————————————————————————————————————————
// [3] Helper Utilities & Multi-Scale Tiers
// ————————————————————————————————————————

var CreateDomainMask = function(Domain) {

  return ee.Image(0).paint( Domain , 1 ).selfMask() ;

};

// ————————————————————————————————————————————
// [3.1] [ANNUAL] Read Annual S2 / PD from LCZP
// ————————————————————————————————————————————

var GetAnnualFromLCZP = function( City , Year ) {

  var LCZPAsset  = ee.Image(AssetBasePath + '/LCZP/' + City.Name + '/' + City.Name + '-' + Year)                             ;
  
  var Unscaled   = Config.UnscaleCube( LCZPAsset )                                                                           ;

  var S2Annual   = Unscaled.select([ 'B1' , 'B2' , 'B3' , 'B4' , 'B5' , 'B6' , 'B7' , 'B8' , 'B8A' , 'B9' , 'B11' , 'B12' ]) ;

  var PopDensity = Unscaled.select('PD')                                                                                     ;

  return { S2Annual : S2Annual , PopDensity : PopDensity }                                                                   ;

};

// ———————————————————————
// [4] Spatial Aggregation
// ———————————————————————

var UpsampleToVIIRS   = function( ScaledCube , Domain ) {

  var LockedVIIRSProj = ee.Projection(VIIRSCRS, VIIRSCRSTransform) ;

  var Grid  = Domain.coveringGrid(LockedVIIRSProj)                 ;

  var Stats = ScaledCube.reduceRegions({

    collection : Grid                                              ,

    reducer    : ee.Reducer.mean()                                 ,

    scale      : CoarseningScale                                   ,

    crs        : ScaledCube.select(0).projection()                 ,

    tileScale  : TileScale

  });

  var BandNames   = ScaledCube.bandNames()                                                ;

  var Canvas      = ee.Image.constant(0).selfMask().setDefaultProjection(LockedVIIRSProj) ;

  var SingleBands = BandNames.map(function(bName) {

    var bandStr   = ee.String(bName)                                                      ;
   
    var Valid     = Stats.filter( ee.Filter.notNull( [ bandStr ] ) )                      ;

    return Canvas.paint(Valid, bandStr).rename(bandStr)                                   ;

  });

  var CoarseImage = ee.ImageCollection.fromImages(SingleBands).toBands().rename(BandNames).clip(Domain) ;

  return CoarseImage ;

};

// ————————————————————
// [5] Export Pipelines
// ————————————————————

// [5.1] LCZ Product Export [LCZP] 

var ExportLCZP      = function( City , Year ) {

  var LCZDomainMask = CreateDomainMask(City.LCZDomain)                                                                                                                   ;

  var StartDate     = Year + '-01-01'                                                                                                                                    ;

  var EndDate       = Year + '-12-31'                                                                                                                                    ;

  var Cube          = FeatureLib.SpatiotemporalCube( City.LCZDomain , StartDate , EndDate , City.Name , Year , true , false , null , null ).updateMask(LCZDomainMask)    ;

  var Scaled        = ScaleCube(Cube)                                                                                                                                    ;

  Export.image.toAsset({

    assetId          : Config.AssetRoot + '/STC/LCZP/' + City.Name + '/' + City.Name + '-' + Year ,

    image            : Scaled                                                                     ,

    description      : 'LCZP-' + City.Name + '-' + Year                                           ,

    region           : City.LCZDomain.geometry()                                                  ,

    scale            : FineResolution                                                             ,

    crs              : City.UTM                                                                   ,

    maxPixels        : MaxPixels                                                                  ,

    overwrite        : true

  }) ;

} ;

// [5.2] LCZ Texture Export [LCZP-GLCM]

var ExportLCZPGLCM   = function( City , Year ) {

  var LCZPAssetPath = Config.AssetRoot + '/STC/LCZP/' + City.Name + '/' + City.Name + '-' + Year ;

  var RawCube       = ee.Image(LCZPAssetPath)                                                  ;

  var BaseCube      = Config.UnscaleCube(RawCube)                                              ;

  var GLCMDomain    = City.LCZDomain.geometry().bounds()                                       ;

  var OnlyGLCM      = FeatureLib.AddSpatialTextureExport(BaseCube).clip(GLCMDomain)            ;

  Export.image.toAsset({

    assetId          : LCZPAssetPath + '-GLCM'                        ,

    image            : OnlyGLCM                                       ,

    description      : 'LCZP-GLCM-' + City.Name + '-' + Year          ,

    region           : City.LCZDomain.geometry()                      ,

    scale            : FineResolution                                 ,

    crs              : City.UTM                                       ,

    maxPixels        : MaxPixels                                      ,

    overwrite        : true

  });

};

// [5.3] Fine-Scale Static & Dynamic Exports [FINP]

var FineStaticExport = function( City ) { // [FINP—STATIC]

  var FINPDomainMask = CreateDomainMask(City.LCZDomain.geometry().buffer(SafetyBuffer))                                                                                             ;

  var BaseSeason     = City.Seasons[0]                                                                                                                                  ;

  var Cube           = FeatureLib.SpatiotemporalCube( City.LCZDomain , BaseSeason.start , BaseSeason.end , City.Name , BaseSeason.LCZYear ).updateMask( FINPDomainMask) ;

  var Scaled         = ScaleCube( Cube )                                                                                                                                ;

  var StaticScaled   = Scaled.select( StaticBands )                                                                                                                     ;

  Export.image.toAsset({

    assetId     : Config.AssetRoot + '/STC/FINP/' + City.Name + '/Static/' + City.Name ,

    image       : StaticScaled                                                         ,

    description : 'FINP-Static-' + City.Name                                           ,

    region      : City.LCZDomain.geometry().buffer(SafetyBuffer)                       ,

    crs         : City.UTM                                                             ,

    scale       : FineResolution                                                       ,

    maxPixels   : MaxPixels                                                            ,

    overwrite   : true

  });

};

var FineDynamicExport = function( City , Season ) { // [FINP—DYN]

  var FINPDomainMask = CreateDomainMask(City.FINPDomain)                                                                                                                                                            ;

  var Annual         = GetAnnualFromLCZP( City , Season.LCZYear )                                                                                                                                                   ;

  var Cube           = FeatureLib.SpatiotemporalCube( City.FINPDomain , Season.start , Season.end , City.Name , Season.LCZYear , true , false , Annual.S2Annual , Annual.PopDensity ).updateMask(FINPDomainMask)    ;

  var Scaled         = ScaleCube( Cube )                                                                                                                                                                            ;

  Export.image.toAsset({

    assetId     : Config.AssetRoot + '/STC/FINP/' + City.Name + '/Dynamic/' + City.Name + '-' + Season.label ,

    image       : Scaled                                                                                     ,

    description : 'FINP-DYN-' + City.Name + '-' + Season.label                                               ,

    region      : City.FINPDomain.geometry()                                                                 ,

    crs         : City.UTM                                                                                   ,

    scale       : FineResolution                                                                             ,

    maxPixels   : MaxPixels                                                                                  ,

    overwrite   : true

  }) ;

} ;

// [5.4] Coarse-Scale Static & Dynamic Exports [CORP]

var CoarseStaticExport = function(City) { // [CORP-STATIC]

  var CORPDomainMask = CreateDomainMask(City.CORPDomain)                                                                                                                                                      ;

  var BaseSeason     = City.Seasons[0]                                                                                                                                                                        ;

  var Cube           = FeatureLib.SpatiotemporalCube( City.CORPDomain , BaseSeason.start , BaseSeason.end , City.Name , BaseSeason.LCZYear , false , true ).updateMask(CORPDomainMask).select(StaticBands)    ;

  var CoarseImage    = UpsampleToVIIRS( Cube , City.CORPDomain )                                                                                                                                              ;

  Export.image.toAsset({

    assetId          : Config.AssetRoot + '/STC/CORP/' + City.Name + '/Static/' + City.Name ,

    image            : CoarseImage                                                          ,

    description      : 'CORP-Static-' + City.Name                                           ,

    region           : City.CORPDomain                                                      ,

    crs              : VIIRSCRS                                                             ,

    crsTransform     : VIIRSCRSTransform                                                    ,

    maxPixels        : MaxPixels                                                            ,

    pyramidingPolicy : { '.default': 'mean' }                                               ,

    overwrite        : true

  });

};

var CoarseDynamicExport = function(City, Season) { // [CORP-DYN]

  var CORPDomainMask    = CreateDomainMask(City.CORPDomain)                                                                                                                                           ;

  var Annual            = GetAnnualFromLCZP( City , Season.LCZYear )                                                                                                                                  ;

  var Cube              = FeatureLib.SpatiotemporalCube( City.CORPDomain , Season.start , Season.end , City.Name , Season.LCZYear , true , true , Annual.S2Annual , null ).updateMask(CORPDomainMask) ;

  var CoarseImage       = UpsampleToVIIRS( Cube , City.CORPDomain )                                                                                                                                   ;

  Export.image.toAsset({

    assetId          : Config.AssetRoot + '/STC/CORP/' + City.Name + '/Dynamic/' + City.Name + '-' + Season.label ,

    description      : 'CORP-DYN-' + City.Name + '-' + Season.label                                               ,

    crsTransform     : VIIRSCRSTransform                                                                          ,

    image            : CoarseImage                                                                                ,

    region           : City.CORPDomain                                                                            ,

    crs              : VIIRSCRS                                                                                   ,

    maxPixels        : MaxPixels                                                                                  ,

    pyramidingPolicy : { '.default': 'mean' }                                                                     ,

    overwrite        : true

  }) ;

} ;

// ——————————————————————————————
// [6] Resolve CRS & Batch Export
// ——————————————————————————————

var PendingCities = Cities.length ;

Cities.forEach(function(City) {

  Config.CityCRS[ City.Name ].evaluate(function(ResolvedCRS) {

    City.UTM = ResolvedCRS ;

    PendingCities -= 1     ;
 
    if (PendingCities === 0) { RunBatch() ; }

  }) ;

}) ;

var RunBatch = function() {

  Cities.forEach(function(City) {

    if ( Switch.FINPStatic ) {

      FineStaticExport(City) ; // [FINP-STATIC]

    }

    if ( Switch.CORPStatic ) {

      CoarseStaticExport(City) ; // [CORP-STATIC]

    }

    if ( Switch.LCZP || Switch.LCZPGLCM ) {

      City.LCZYears.forEach(function(Year) {
    
        if ( Switch.LCZP ) {

          ExportLCZP( City , Year ) ; // [LCZP–Annual]

        }
    
        if ( Switch.LCZPGLCM ) {

          ExportLCZPGLCM( City , Year ) ; // [LCZP–Annual-GLCM] 

        }
    
      }) ;

    }

    if ( Switch.FINPDynamic || Switch.CORPDynamic ) {

      City.Seasons.forEach(function(Season) {

        if ( Switch.FINPDynamic ) {

          FineDynamicExport( City , Season ) ; // [FINP-DYN]

        }

        if ( Switch.CORPDynamic ) {

          CoarseDynamicExport( City , Season ) ; // [CORP-DYN]

        }

      }) ;

    }

  }) ;

} ;

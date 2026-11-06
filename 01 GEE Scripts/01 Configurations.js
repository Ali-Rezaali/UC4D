// ———————————————————————————————————————————
// [1] Configuration Reference & Site Registry
// ———————————————————————————————————————————

exports.Visualization  = require('users/alirezaali/UC4D:Utilities/04 Visualization Palettes') ;

var Repository         = 'UC4D'                                                               ;

var ProjectName        = 'ee-alirezaali'                                                      ;

exports.Repository     = Repository                                                           ;

exports.ProjectName    = ProjectName                                                          ;

exports.WorldPopFolder = 'projects/' + ProjectName + '/assets/' + Repository + '/WorldPop'    ;

exports.AssetRoot      = 'projects/' + ProjectName + '/assets/' + Repository                  ;

// —————————————————————————————————————
// [1.0] Administrative Boundary Sources
// —————————————————————————————————————

exports.WBOB_ADM0      = 'projects/sat-io/open-datasets/WORLD-BANK/WBGAD/WB_GAD_ADM0' ;

exports.WBOB_ADM1      = 'projects/sat-io/open-datasets/WORLD-BANK/WBGAD/WB_GAD_ADM1' ;

exports.WBOB_ADM2      = 'projects/sat-io/open-datasets/WORLD-BANK/WBGAD/WB_GAD_ADM2' ;

exports.GAUL_L2        = 'projects/sat-io/open-datasets/FAO/GAUL/GAUL_2024_L2'        ;

exports.GAUL_L1        = 'projects/sat-io/open-datasets/FAO/GAUL/GAUL_2024_L1'        ;

// ——————————————————————————————
// [1.1] Study-Site Configuration
// ——————————————————————————————

//   Name            : Asset-Name Suffix, Must Match The Spatial-Domains Folder Names.

//   Label           : Short Map / Plot Label (e.g. 'TEH').

//   Calendar        : 'Meteorological' | 'Monsoonal' → Picks The Season Template.

//   Registry        : CityRegistry Entry Consumed by 02 Spatial Domains.js.

//

// Registry.source :

//   'Asset' → { source : 'asset' , path : <assetID> , dissolve : <bool> }        | Custom ShapeFile | Use When Neither WBOB Nor GAUL Matches The City.

//   'WBOB'  → { source : 'WBOB' , aliases : [ ... ] , CountryAliases : [ ... ] } | World Bank Official Boundaries | ADM2 → ADM1 → ADM0. Country Column : NAM_0

//   'GAUL'  → { source : 'GAUL' , aliases : [ ... ] , CountryAliases : [ ... ] } | FAO GAUL 2024 | L2 → L1 | Country Column : gaul0_name

//   CountryAliases : Spellings of The Country Name as They Appear in The Source Dataset. Empty List → Country Filter Is Skipped and The Match is Name-Only.

// ——————————————————————————————————————————————————————————————————————

var PrimaryCities  = [ 

  { Name : 'Tehran'       , Label : 'TEH' , Calendar : 'Meteorological' , Registry : { source : 'Asset' , path : exports.AssetRoot + '/Spatial-Domains/Tehran-Districts' , dissolve : true , CountryAliases : [ 'Iran' ] } } ,

  { Name : 'Singapore'    , Label : 'SNG' , Calendar : 'Monsoonal'      , Registry : { source : 'WBOB' , aliases : [ 'Singapore' ] , CountryAliases : [ 'Singapore' ] } } ,

] ;

var SecondaryCities = [ 

  { Name : 'Amsterdam'    , Label : 'AMS' , Calendar : 'Meteorological' , Registry : { source : 'GAUL' , aliases : [ 'Amsterdam' ] , CountryAliases : [ 'Netherlands (Kingdom of the)' ] } } ,

  { Name : 'Mumbai'       , Label : 'BOM' , Calendar : 'Monsoonal'      , Registry : { source : 'GAUL' , aliases : [ 'Mumbai City' ] , CountryAliases : [ 'India' ] } } ,

  { Name : 'Osaka'        , Label : 'OSA' , Calendar : 'Meteorological' , Registry : { source : 'GAUL' , aliases : [ 'Osaka' ] , CountryAliases : [ 'Japan' ] } } ,

  { Name : 'Cairo'        , Label : 'CAI' , Calendar : 'Meteorological' , Registry : { source : 'GAUL' , aliases : [ 'New Cairo-1' ] , CountryAliases : [ 'Egypt' ] } } ,

  { Name : 'Reykjavik'    , Label : 'REK' , Calendar : 'Meteorological' , Registry : { source : 'GAUL' , aliases : [ 'Reykjavíkurborg' ] , CountryAliases : [ 'Iceland' ] } } ,

  { Name : 'Beijing'      , Label : 'PEK' , Calendar : 'Meteorological' , Registry : { source : 'GAUL' , aliases : [ 'Beijing Municipality' ] , CountryAliases : [ 'China' ] } } ,

  { Name : 'Arequipa'     , Label : 'AQP' , Calendar : 'Meteorological' , Registry : { source : 'GAUL' , level : 'L2' , aliases : [ 'Arequipa' , 'Arequipa District' ] , CountryAliases : [ 'Peru' ] } } ,

  { Name : 'Marrakech'    , Label : 'RAK' , Calendar : 'Meteorological' , Registry : { source : 'GAUL' , aliases : [ 'Marrakech' , 'Marrakesh' ] , CountryAliases : [ 'Morocco' ] } } ,

  { Name : 'Perth'        , Label : 'PER' , Calendar : 'Meteorological' , Registry : { source : 'GAUL' , level : 'L2' , aliases : [ 'Perth (West) - Northbridge' ] , CountryAliases : [ 'Australia' ] } } ,

  { Name : 'CapeTown'     , Label : 'CPT' , Calendar : 'Meteorological' , Registry : { source : 'GAUL' , aliases : [ 'City Of Cape Town' ] , CountryAliases : [ 'South Africa' ] } } ,

  { Name : 'Islamabad'    , Label : 'ISB' , Calendar : 'Meteorological' , Registry : { source : 'GAUL' , aliases : [ 'Islamabad' ] , CountryAliases : [ 'Pakistan' ] } } ,

  { Name : 'AddisAbaba'   , Label : 'ADD' , Calendar : 'Meteorological' , Registry : { source : 'GAUL' , aliases : [ 'Addis Ababa' ] , CountryAliases : [ 'Ethiopia' ] } } ,

  { Name : 'SaltLakeCity' , Label : 'SLC' , Calendar : 'Meteorological' , Registry : { source : 'GAUL' , aliases : [ 'Salt Lake' ] , CountryAliases : [ 'United States of America' , 'United States' ] } } ,

  { Name : 'Almaty'       , Label : 'ALA' , Calendar : 'Meteorological' , Registry : { source : 'GAUL' , aliases : [ 'Almaty' ] , CountryAliases : [ 'Kazakhstan' ] } } ,

  { Name : 'Moscow'       , Label : 'MOW' , Calendar : 'Meteorological' , Registry : { source : 'GAUL' , aliases : [ 'Moscow City' , 'Moscow' ] , CountryAliases : [ 'Russian Federation' , 'Russia' ] } } ,

  { Name : 'Anchorage'    , Label : 'ANC' , Calendar : 'Meteorological' , Registry : { source : 'GAUL' , aliases : [ 'Anchorage' ] , CountryAliases : [ 'United States of America' , 'United States' ] } } ,

  { Name : 'Ushuaia'      , Label : 'USH' , Calendar : 'Meteorological' , Registry : { source : 'GAUL' , aliases : [ 'Ushuaia' ] , CountryAliases : [ 'Argentina' ] } } ,

  { Name : 'Jakarta'      , Label : 'JKT' , Calendar : 'Monsoonal'      , Registry : { source : 'GAUL' , level : 'L1' , aliases : [ 'Dki Jakarta' ] , CountryAliases : [ 'Indonesia' ] } } ,

] ;

// —————————————————————————
// [1.2] Derived City Tables
// —————————————————————————

var CitySpec             = PrimaryCities.concat( SecondaryCities )                ;

var TargetCities         = CitySpec.map( function(C) { return C.Name ; } )        ;

var PrimaryTargets       = PrimaryCities.map( function(C) { return C.Name ; } )   ;

var SecondaryTargets     = SecondaryCities.map( function(C) { return C.Name ; } ) ;

exports.CitySpec         = CitySpec                                               ;

exports.TargetCities     = TargetCities                                           ;

exports.PrimaryTargets   = PrimaryTargets                                         ;

exports.SecondaryTargets = SecondaryTargets                                       ;

exports.CityConfigs      = PrimaryCities.map( function(C) {

  return { Name : C.Name , Label : C.Label } ;

} ) ;

exports.CityRegistry = CitySpec.reduce( function(Acc , C) {

  Acc[ C.Name ] = C.Registry                                                      ;
  
  return Acc                                                                      ;

} , {} ) ;

// —————————————————————————————————————————————————
// [1.3] Auto-Detect Intersecting Countries Per City
// —————————————————————————————————————————————————

exports.CountryNamesByCity = ee.Dictionary(

  TargetCities.reduce( function( Acc , CityName ) {

    var Registry = exports.CityRegistry[ CityName ] ;

    if ( Registry.CountryAliases && Registry.CountryAliases.length ) {

      return Acc.set( CityName , Registry.CountryAliases ) ;

    }

    // Fallback To The Asset Country Lookup For Asset-Resolved Cities

    var Domain = ee.FeatureCollection( exports.AssetRoot + '/Spatial-Domains/Complete-Domain/' + CityName )                           ;

    var Source = ( Registry.source === 'GAUL' ) ? ee.FeatureCollection( exports.GAUL_L2 ) : ee.FeatureCollection( exports.WBOB_ADM0 ) ;

    var Field  = ( Registry.source === 'GAUL' ) ? 'gaul0_name' : 'NAM_0'                                                              ;

    var Names  = Source.filterBounds( Domain.geometry() ).aggregate_array( Field )                                                    ;

    return Acc.set( CityName , Names )                                                                                                ;

  } , ee.Dictionary({}) )

) ;

// —————————————————————————————————————————————————
// [2] Auto-Detect UTM CRS per City (Centroid-Based)
// —————————————————————————————————————————————————

var GetUTMCRS          = function(Domain) {

  var Centroid         = Domain.geometry().centroid(1000)                               ;

  var Coords           = Centroid.coordinates()                                         ;

  var Lon              = ee.Number(Coords.get(0))                                       ;

  var Lat              = ee.Number(Coords.get(1))                                       ;

  var ZoneNum          = Lon.add(180).divide(6).floor().add(1)                          ;

  var EPSGBase         = ee.Number(ee.Algorithms.If( Lat.gte(0) , 32600 , 32700 ))      ;

  var EPSGCode         = EPSGBase.add(ZoneNum)                                          ;

  return ee.String('EPSG:').cat( EPSGCode.format('%d') )                                ;

};

var CityCRS = {} ;

TargetCities.forEach(function(CityName) {

  var Domain = ee.FeatureCollection( exports.AssetRoot + '/Spatial-Domains/Complete-Domain/' + CityName ) ;

  CityCRS[CityName] = GetUTMCRS( Domain )                                                                 ;

}) ;

exports.CityCRS = CityCRS ;

// ———————————————————————————————
// [3] Projections & CRS Constants
// ———————————————————————————————

exports.FABDEMProjection  = ee.Projection( 'EPSG:4326' , [ 0.0002777777777777778 , 0 , 5.9998611111111115 , 0 , -0.0002777777777777778 , 1.000138888888889 ] ) ;

exports.PDProjection      = ee.Projection( 'EPSG:4326' , [ 0.00083333333 , 0 , 44.03333243719999 , 0 , -0.00083333333 , 39.78083351021 ] )                     ;

exports.NTLProjection     = ee.Projection( 'EPSG:4326' , [ 0.00416666666 , 0 , -180 , 0 , -0.00416666666 , 80 ] )                                              ;

exports.VIIRSCRSTransform = [ 926.625433055833 , 0 , -20015109.354 , 0 , -926.625433055833 , 8895604.157333 ]                                                  ;

exports.VIIRSCRS          = 'SR-ORG:6974'                                                                                                                      ;

// ——————————————————————————————————————————————————
// [4] Meteorological & Monsoonal Seasons (2020-2025)
// ——————————————————————————————————————————————————
 
var MeteorologicalSeasons = [ 

  { label : 'SPR-2020' , start : '2020-03-01' , end : '2020-05-31' } ,

  { label : 'SUM-2020' , start : '2020-06-01' , end : '2020-08-31' } , 

  { label : 'AUT-2020' , start : '2020-09-01' , end : '2020-11-30' } ,

  { label : 'WIN-2020' , start : '2020-12-01' , end : '2021-02-28' } ,

  { label : 'SPR-2021' , start : '2021-03-01' , end : '2021-05-31' } ,

  { label : 'SUM-2021' , start : '2021-06-01' , end : '2021-08-31' } ,

  { label : 'AUT-2021' , start : '2021-09-01' , end : '2021-11-30' } ,

  { label : 'WIN-2021' , start : '2021-12-01' , end : '2022-02-28' } ,

  { label : 'SPR-2022' , start : '2022-03-01' , end : '2022-05-31' } ,

  { label : 'SUM-2022' , start : '2022-06-01' , end : '2022-08-31' } ,

  { label : 'AUT-2022' , start : '2022-09-01' , end : '2022-11-30' } ,

  { label : 'WIN-2022' , start : '2022-12-01' , end : '2023-02-28' } ,
  
  { label : 'SPR-2023' , start : '2023-03-01' , end : '2023-05-31' } ,

  { label : 'SUM-2023' , start : '2023-06-01' , end : '2023-08-31' } ,

  { label : 'AUT-2023' , start : '2023-09-01' , end : '2023-11-30' } ,

  { label : 'WIN-2023' , start : '2023-12-01' , end : '2024-02-29' } ,

  { label : 'SPR-2024' , start : '2024-03-01' , end : '2024-05-31' } ,

  { label : 'SUM-2024' , start : '2024-06-01' , end : '2024-08-31' } ,

  { label : 'AUT-2024' , start : '2024-09-01' , end : '2024-11-30' } ,

  { label : 'WIN-2024' , start : '2024-12-01' , end : '2025-02-28' } ,

  { label : 'SPR-2025' , start : '2025-03-01' , end : '2025-05-31' } ,

  { label : 'SUM-2025' , start : '2025-06-01' , end : '2025-08-31' } ,

  { label : 'AUT-2025' , start : '2025-09-01' , end : '2025-11-30' } ,

  { label : 'WIN-2025' , start : '2025-12-01' , end : '2026-02-28' } ,

];  
 
var MonsoonalSeasons = [ 
 
  { label : 'NEM-2020' , start : '2019-12-01' , end : '2020-03-15'} ,

  { label : 'IM1-2020' , start : '2020-03-16' , end : '2020-05-31'} ,

  { label : 'SWM-2020' , start : '2020-06-01' , end : '2020-09-15'} ,

  { label : 'IM2-2020' , start : '2020-09-16' , end : '2020-11-30'} , 
 
  { label : 'NEM-2021' , start : '2020-12-01' , end : '2021-03-15'} ,

  { label : 'IM1-2021' , start : '2021-03-16' , end : '2021-05-31'} ,

  { label : 'SWM-2021' , start : '2021-06-01' , end : '2021-09-15'} ,

  { label : 'IM2-2021' , start : '2021-09-16' , end : '2021-11-30'} ,

  { label : 'NEM-2022' , start : '2021-12-01' , end : '2022-03-15'} ,

  { label : 'IM1-2022' , start : '2022-03-16' , end : '2022-05-31'} ,

  { label : 'SWM-2022' , start : '2022-06-01' , end : '2022-09-15'} ,

  { label : 'IM2-2022' , start : '2022-09-16' , end : '2022-11-30'} ,
 
  { label : 'NEM-2023' , start : '2022-12-01' , end : '2023-03-15'} ,

  { label : 'IM1-2023' , start : '2023-03-16' , end : '2023-05-31'} ,

  { label : 'SWM-2023' , start : '2023-06-01' , end : '2023-09-15'} ,

  { label : 'IM2-2023' , start : '2023-09-16' , end : '2023-11-30'} ,

  { label : 'NEM-2024' , start : '2023-12-01' , end : '2024-03-15'} ,

  { label : 'IM1-2024' , start : '2024-03-16' , end : '2024-05-31'} ,

  { label : 'SWM-2024' , start : '2024-06-01' , end : '2024-09-15'} ,

  { label : 'IM2-2024' , start : '2024-09-16' , end : '2024-11-30'} ,

  { label : 'NEM-2025' , start : '2024-12-01' , end : '2025-03-15'} ,

  { label : 'IM1-2025' , start : '2025-03-16' , end : '2025-05-31'} ,

  { label : 'SWM-2025' , start : '2025-06-01' , end : '2025-09-15'} ,

  { label : 'IM2-2025' , start : '2025-09-16' , end : '2025-11-30'} ,
 
]; 
 
// ————————————————————————————
// [4.1] Per-City Season Tables
// ————————————————————————————

var SeasonTemplates = { Meteorological : MeteorologicalSeasons , Monsoonal : MonsoonalSeasons } ;

CitySpec.forEach( function( C ) {

  exports[ C.Name + 'Seasons' ] = SeasonTemplates[ C.Calendar ].map( function(s) {

    return {

      label     : s.label                    ,

      start     : s.start                    ,

      end       : s.end                      ,

      City      : C.Name                     ,

      region    : C.Name + '-Holdout-Domain' ,

      LCZYear   : s.label.split('-')[1]      ,

      crs       : CityCRS[ C.Name ]

    } ;

  } ) ;

} ) ;

// ————————————————————————————
// [4.2] Spatial Domain Exports
// ————————————————————————————

TargetCities.forEach(function(CityName) {
 
  exports[CityName + 'HoldoutDomain']  = ee.FeatureCollection(exports.AssetRoot + '/Spatial-Domains/Holdout-Domain/'  + CityName) ;
 
  exports[CityName + 'SUHIDomain']     = ee.FeatureCollection(exports.AssetRoot + '/Spatial-Domains/SUHI-Domain/'     + CityName) ;
 
  exports[CityName + 'LCZDomain']      = ee.FeatureCollection(exports.AssetRoot + '/Spatial-Domains/LCZ-Domain/'      + CityName) ;
 
  exports[CityName + 'CompleteDomain'] = ee.FeatureCollection(exports.AssetRoot + '/Spatial-Domains/Complete-Domain/' + CityName) ;
 
  exports[CityName + 'TrainingDomain'] = ee.FeatureCollection(exports.AssetRoot + '/Spatial-Domains/Training-Domain/' + CityName) ;

}) ;

// ——————————————————————————————————————
// [5] Model, Processing & Misc Constants
// ——————————————————————————————————————

exports.RF                        = { numberOfTrees : 150 , minLeafPopulation : 5 , bagFraction : 0.632 } ;

exports.GLCMRanges                = { B8 : [ 200 , 4000 ] , B12 : [ 200 , 3900 ] , VH : [ -24.5 , -2.5 ] , VV : [ -18.5 , 8.5 ] } ;

exports.MaxPixels                 = 1e13              ;

exports.TileScale                 = 8                 ;

exports.TargetResolution          = 10                ;

exports.RandomSeed                = 42                ;

exports.NoData                    = -9999             ;

exports.ERA5LandRes               = 11132             ;

exports.ResamplingMethod          = 'bilinear'        ;

exports.SpatialDomainsDriveFolder = 'Spatial Domains' ;

// ———————————————————————————————————
// [6] Band Scaling & Unscaling Module
// ———————————————————————————————————

var GLCMBandsByMetric = { VAR: [] , CONTRAST: [] , IDM: [] , ENT: [] } ;

[ 'VH' , 'VV' , 'B12' , 'B8' ].forEach( function( Band ) {

  [ 1 , 3 , 7 , 9 ].forEach( function( Window ) {

    Object.keys( GLCMBandsByMetric ).forEach( function( Metric ) {

      GLCMBandsByMetric[ Metric ].push( Band + '-' + Metric + '-' + Window ) ;

    } ) ;

  } ) ;

} ) ;

var BandSpecs = [ 

  { Bands : [ 'NDVI' , 'MNDWI' , 'NDWI' , 'BLFEI' , 'EVI2' , 'MSAVI2' , 'NDMI' , 'Emissivity' , 'Albedo' , 'Northness' , 'Eastness' , 'NDRE' , 'BSI' , 'FVC' , 'SVF' , 'BCR' , 'FAI' ]    , Scale : 10000 , Type : 'toInt16'  }  ,
    
  { Bands : [ 'VV' , 'VH' , 'Diff' , 'SDH' ]                                                                                                                                              , Scale : 100   , Type : 'toInt16'  }  ,

  { Bands : [ 'NTL' , 'BH' , 'PD' ]                                                                                                                                                       , Scale : 100   , Type : 'toUint32' }  ,
    
  { Bands : [ 'B1' , 'B2' , 'B3' , 'B4' , 'B5' , 'B6' , 'B7' , 'B8' , 'B8A' , 'B9' , 'B11' , 'B12' ]                                                                                      , Scale : 1     , Type : 'toUint16' }  ,
  
  { Bands : [ 'Elevation' ]                                                                                                                                                               , Scale : 100   , Type : 'toInt32'  }  ,

  { Bands : [ 'Slope' ]                                                                                                                                                                   , Scale : 100   , Type : 'toUint16' }  ,

  { Bands : GLCMBandsByMetric.VAR                                                                                                                                                         , Scale : 10    , Type : 'toUint16' }  ,

  { Bands : GLCMBandsByMetric.CONTRAST                                                                                                                                                    , Scale : 10    , Type : 'toUint16' }  ,

  { Bands : GLCMBandsByMetric.IDM                                                                                                                                                         , Scale : 10000 , Type : 'toUint16' }  ,

  { Bands : GLCMBandsByMetric.ENT                                                                                                                                                         , Scale : 1000  , Type : 'toUint16' }

] ;

// ————————————————————
// [6.1] Scaling Module 
// ————————————————————

var ScaleCube       = function( Image ) {

  var PresentBands  = Image.bandNames() ;

  var ScaledGroups  = BandSpecs.map(function( Spec ) {

    var TargetBands = PresentBands.filter( ee.Filter.inList( 'item' , Spec.Bands ) ) ;

    var HasBands    = TargetBands.size().gt( 0 ) ;

    var SubImage    = ee.Image( ee.Algorithms.If( HasBands , Image.select( TargetBands ) , ee.Image( [] ) ) ) ;

    var Processed   = ee.Image( ee.Algorithms.If( HasBands , ( Spec.Scale !== 1 ) ? SubImage.multiply( Spec.Scale ).round() : SubImage.round() ,  ee.Image( [] ) ) ) ;

    return ee.Image( Processed[ Spec.Type ]() ) ;

  }) ;

  return ee.Image.cat( ScaledGroups ).select( PresentBands ) ;

} ;

// ——————————————————————
// [6.2] Unscaling Module 
// ——————————————————————

var UnscaleCube          = function( ScaledImage ) {

  var PresentBands       = ScaledImage.bandNames() ;

  var UnscaledGroups     = BandSpecs.map(function( Spec ) {

    var TargetBands      = PresentBands.filter( ee.Filter.inList( 'item' , Spec.Bands ) )                                               ;

    var HasBands         = TargetBands.size().gt( 0 )                                                                                   ;

    var SubImage         = ee.Image( ee.Algorithms.If( HasBands , ScaledImage.select( TargetBands ).toFloat() , ee.Image( [] ) ) )      ;

    return ee.Image( ee.Algorithms.If( HasBands , ( Spec.Scale !== 1 ) ? SubImage.divide( Spec.Scale ) : SubImage , ee.Image( [] ) ) )  ;

  }) ;

  return ee.Image.cat( UnscaledGroups ).select( PresentBands )                                                                          ;

} ;

exports.BandSpecs   = BandSpecs   ;

exports.ScaleCube   = ScaleCube   ;

exports.UnscaleCube = UnscaleCube ;

// ———————————————————
// [7] Predictor Suite
// ———————————————————

// [7.1] Air Temperature (T2M)

exports.T2MPredictors = [ 
      
  'Elevation' , 'Slope' , 'Northness' , 'Eastness' ,                                   // Topography
  
  'NDVI' , 'EVI2' , 'BLFEI' , 'BSI' , 'MNDWI' , 'NDWI' , 'Albedo' , 'Emissivity' ,     // Surface Properties & Physics
  
  'NTL' ,                                                                              // Anthropogenic Heat
   
  'SVF' , 'BH' , 'SDH' , 'BCR' , 'FAI'                                                 // 3D Urban Morphology

] ;
    
// [7.2] Wind Speed 10M (WS)
  
exports.WSPredictors = [ 
  
  'Elevation' , 'Slope' , 'Northness' , 'Eastness' ,                                   // Topography
  
  'BLFEI' , 'NDVI' , 'EVI2' ,                                                          // Spectral Indices
  
  'VV' , 'VH' , 'Diff',                                                                // Radar Backscatter & Surface Roughness

  'SVF' , 'BH' , 'SDH' , 'BCR' , 'FAI'                                                 // 3D Urban Morphology

] ;
    
// [7.3] Soil Moisture (SM)

exports.SMPredictors =  [ 
  
  'Elevation' , 'Slope' , 'Eastness' , 'Northness' ,                                   // Topography
  
  'VV' , 'VH' , 'Diff' ,                                                               // Radar Backscatter & Surface Roughness

  'FVC' , 'NDVI' , 'EVI2' , 'MNDWI' , 'NDMI' , 'BLFEI' , 'MSAVI2' , 'BSI' , 'Albedo'   // Surface Properties & Physics

] ;

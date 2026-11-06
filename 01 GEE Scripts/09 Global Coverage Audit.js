// ———————————————————————————
// [1] Modules & Configuration
// ———————————————————————————

var Config       = require('users/alirezaali/UC4D:01 Configurations')                           ;

var FeatureLib   = require('users/alirezaali/UC4D:04 Multi-Source Feature Library')             ;

var Overpass     = require('users/alirezaali/UC4D:Utilities/05 VIIRS Overpass Resolver')        ;

var Cities       = Config.SecondaryTargets                                                      ;

var DomainBase   = Config.AssetRoot + '/Spatial-Domains'                                        ;

var MaxPixels    = Config.MaxPixels                                                             ;

var GetSentinel1 = FeatureLib.GetSentinel1                                                      ;

var GetSentinel2 = FeatureLib.GetSentinel2                                                      ;

var SpectralIdx  = FeatureLib.SpectralIndicesFunction                                           ;

var Season       = { label : 'Mar 1–May 31, 2025' , start : '2025-03-01' , end : '2025-05-31' } ;

var PackBands    = [
  
    'VV'     , 'VH'     , 'Diff'       ,
    
    'NDVI'   , 'MSAVI2' , 'NDWI'       , 'NDMI' , 'NDRE'  , 'BSI'   , 'MNDWI' , 'EVI2' , 'BLFEI' ,
    
    'Albedo' , 'FVC'    , 'Emissivity' , 'NTL'  , 'T2M_C' , 'D2M_C' , 'WS_ms'
    
] ;

// ————————————————————
// [2] Helper Functions
// ————————————————————

var PadD     = function( V , D ) { var S = String(Math.abs(V)) ; while (S.length < D) S = '0' + S ; return S ; };

var TileName = function( LonF , LatF ) {

  var Sz = 5 , LatT = LatF + Sz;

  return (LonF >= 0 ? 'e' : 'w') + PadD(LonF , 3) + '_' + (LatT >= 0 ? 'n' : 's') + PadD(LatT , 2) + '_'
  
       + (LonF >= 0 ? 'e' : 'w') + PadD(LonF+Sz   , 3) + '_' + (LatF >= 0 ? 'n' : 's') + PadD(LatF , 2)      ;

} ;

// ———————————————————————————
// [3] Per-City Check Pipeline
// ———————————————————————————

var BuildRow = function( City , TargetUTC ) {

  // [3.1] Domain & Tiles

  var Domain   = ee.FeatureCollection( DomainBase + '/Holdout-Domain/' + City )             ;

  var Geom     = Domain.geometry()                                                          ;

  var Bounds   = Geom.bounds(1).coordinates().get(0)                                        ;

  var Lons     = ee.List( Bounds ).map(function(P){ return ee.List(P).get(0) ; })           ;

  var Lats     = ee.List( Bounds ).map(function(P){ return ee.List(P).get(1) ; })           ;

  var LonMin   = ee.Number( ee.List(Lons).reduce( ee.Reducer.min() ) )                      ;

  var LonMax   = ee.Number( ee.List(Lons).reduce( ee.Reducer.max() ) )                      ;

  var LatMin   = ee.Number( ee.List(Lats).reduce( ee.Reducer.min() ) )                      ;

  var LatMax   = ee.Number( ee.List(Lats).reduce( ee.Reducer.max() ) )                      ;

  var Lon0     = LonMin.divide(5).floor().multiply(5)                                       ;

  var Lat0     = LatMin.divide(5).floor().multiply(5)                                       ;

  var LonRange = ee.List.sequence( 0 , LonMax.subtract(Lon0).divide(5).ceil().subtract(1) ) ;

  var LatRange = ee.List.sequence( 0 , LatMax.subtract(Lat0).divide(5).ceil().subtract(1) ) ;

  var Tiles    = LonRange.map(function(I){
  
    return LatRange.map(function(J){
 
      return ee.String( TileName( ee.Number(Lon0).add(ee.Number(I).multiply(5)) ,  ee.Number(Lat0).add(ee.Number(J).multiply(5)) ) ) ;
 
    }) ;

  }).flatten() ;

  // [3.2] Data Ingestion

  // [3.2.1] Sentinel-1 + Sentinel-2 + Indices

  var S1       = GetSentinel1( Geom , Season.start , Season.end )              ;

  var S1Scenes = FeatureLib.GetSentinel1Raw( Geom , Season.start , Season.end ).size() ;

  var S2Coll   = GetSentinel2( Geom , Season.start , Season.end , false )      ;

  var S2Mean   = S2Coll.mean()                                                 ;

  var Idx      = SpectralIdx( S2Mean ).select([ 'NDVI' , 'MSAVI2' , 'NDWI' , 'NDMI' , 'NDRE' , 'BSI' , 'MNDWI' , 'EVI2' , 'BLFEI' , 'Albedo' , 'FVC' , 'Emissivity' ] );
  
  // [3.2.2] VIIRS NTL

  var NTLCol = ee.ImageCollection('NASA/VIIRS/002/VNP46A2')
         
                 .filterBounds(Geom).filterDate(Season.start , Season.end)
         
                 .select('Gap_Filled_DNB_BRDF_Corrected_NTL') ;

  var NTL = NTLCol.mean().rename('NTL').setDefaultProjection(Config.NTLProjection);

  // [3.2.3] ERA5-Land at Target UTC (Resolved Per City by The Overpass Resolver)

  var E5 = ee.ImageCollection('ECMWF/ERA5_LAND/HOURLY')
         
                     .filterBounds(Geom).filterDate(Season.start , Season.end)
         
                     .filter(ee.Filter.calendarRange(TargetUTC, TargetUTC, 'hour')) ;

  var E5M  = E5.mean()                                                               ;

  var T2M  = E5M.select('temperature_2m').subtract(273.15).rename('T2M_C')           ;

  var D2M  = E5M.select('dewpoint_temperature_2m').subtract(273.15).rename('D2M_C')  ;

  var U    = E5M.select('u_component_of_wind_10m')                                   ;

  var V    = E5M.select('v_component_of_wind_10m')                                   ;

  var WS   = U.pow(2).add(V.pow(2)).sqrt().rename('WS_ms')                           ;

  var Pack = S1.addBands(Idx).addBands(NTL).addBands(T2M).addBands(D2M).addBands(WS) ;

  // [3.3] Statistics & Row Assembly

  var Stats = Pack.reduceRegion({

    reducer    : ee.Reducer.mean().combine({ reducer2 : ee.Reducer.stdDev() , sharedInputs : true }) ,

    geometry   : Geom                                                                                ,

    scale      : 100                                                                                 ,

    maxPixels  : MaxPixels                                                                           ,

    bestEffort : true

  }) ;

  var ValidCount = Pack.select('NDVI').reduceRegion({

    reducer    : ee.Reducer.count() ,

    geometry   : Geom               ,

    scale      : 100                ,

    maxPixels  : MaxPixels          ,

    bestEffort : true

  }).get('NDVI') ;

  var Row = {

    City         : City                 ,

    Season       : Season.label         ,

    CRS          : Config.CityCRS[City] ,

    S1_Scenes    : S1Scenes             ,

    S2_Scenes    : S2Coll.size()        ,

    VIIRS_Scenes : NTLCol.size()        ,

    ERA5_Scenes  : E5.size()            ,

    GBA_Tiles    : Tiles.size()         ,

    Valid_Pixels : ValidCount

  } ;

  PackBands.forEach(function( B ) {

    Row[ B + '_mean'   ] = Stats.get( B + '_mean'   ) ;

    Row[ B + '_stdDev' ] = Stats.get( B + '_stdDev' ) ;

  }) ;

  return ee.Feature(null , Row)  ;

} ;

// ——————————————————————
// [4] Execution & Export
// ——————————————————————

Overpass.Resolve( function( T ) {

  print( 'VIIRS Overpass → Coverage Audit Hours:' , T ) ;

  var Rows = Cities.map( function( City ) { return BuildRow( City , T[ City ].UTCHour ) ; } ) ;

  Export.table.toDrive({

    collection     : ee.FeatureCollection(Rows) ,

    description    : 'UC4D-Global-Check'        ,

    folder         : 'UC4D/UC4D-Validation'     ,

    fileNamePrefix : 'UC4D-Global-Check'        ,

    fileFormat     : 'CSV'

  }) ;

} , Cities ) ;

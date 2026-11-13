// ──────────────────────────────
// [1] Settings, Config & Modules
// ──────────────────────────────

var Config         = require('users/alirezaali/UC4D:01 Configurations')               ;

var FeatureLib     = require('users/alirezaali/UC4D:04 Multi-Source Feature Library') ;

var Bands          = [ 'B8' , 'B12' , 'VH' , 'VV' ]                                   ;

var PercentileLow  = 1                                                                ;

var PercentileHigh = 99                                                               ;

var SampleScale    = 150                                                              ;

var CityRanges     = {}                                                               ;

var AllSamples     = ee.FeatureCollection([])                                         ;

// ─────────────────────────────────
// [2] Calculate Per-City Statistics
// ─────────────────────────────────

Config.PrimaryTargets.forEach( function( City ) {
  
  var Domain      = Config[ City + 'HoldoutDomain' ].geometry() ;

  var CitySamples = ee.FeatureCollection([])                    ;

  Config[ City + 'Seasons' ].forEach( function( Season ) {
    
    var S1        = FeatureLib.GetSentinel1( Domain , Season.start , Season.end ).select( [ 'VH' , 'VV' ] ) ;

    var S2        = FeatureLib.GetSentinel2( Domain , Season.start , Season.end , false ).mean().select( [ 'B8' , 'B12' ] ) ;

    var Composite = S2.addBands( S1 ) ;

    var Run       = Composite.sample({

      region     : Domain      ,

      scale      : SampleScale ,

      geometries : false       ,

      tileScale  : 4

    }) ;

    CitySamples = CitySamples.merge( Run ) ;

  } ) ;

  AllSamples = AllSamples.merge( CitySamples ) ;

  var Result = {} ;

  Bands.forEach( function( Band ) {

    Result[ Band ] = CitySamples.reduceColumns( {

      reducer   : ee.Reducer.percentile( [ PercentileLow , PercentileHigh ] ) ,

      selectors : [ Band ]

    } ) ;

  } ) ;

  CityRanges[ City ] = Result;

} ) ;

// ───────────────────────────────────
// [3] Calculate Pooled Statistics
// ───────────────────────────────────

var PooledResult = {};

Bands.forEach( function( Band ) {

  PooledResult[ Band ] = AllSamples.reduceColumns( {

    reducer   : ee.Reducer.percentile( [ PercentileLow , PercentileHigh ] ) ,

    selectors : [ Band ]

  } ) ;

} ) ;

// ───────────────────
// [4] Format Results
// ───────────────────

var Step = { B8 : 100 , B12 : 100 , VH : 0.5 , VV : 0.5 } ;

var Out  = {}                                             ;

Bands.forEach( function( Band ) {

  var Lo      = ee.Number( PooledResult[ Band ].get( 'p' + PercentileLow  ) )          ;

  var Hi      = ee.Number( PooledResult[ Band ].get( 'p' + PercentileHigh ) )          ;

  var s       = Step[ Band ]                                                           ;

  Out[ Band ] = [ Lo.divide(s).floor().multiply(s) , Hi.divide(s).ceil().multiply(s) ] ;

} ) ;

print( 'Per-City Raw Percentiles:'              , CityRanges )                         ;

print( 'Pooled Raw Percentiles:'                , PooledResult )                       ;

print( 'Pooled Rounded Ranges (Frozen Config):' , Out )                                ;

// ───────────────────
// [5] Export Samples
// ───────────────────

Export.table.toDrive({

  collection     : AllSamples                 ,

  description    : 'GLCM-Calibration-Samples' ,

  folder         : 'UC4D/UC4D-Validation'     ,

  fileNamePrefix : 'GLCM-Calibration-Samples' ,

  fileFormat     : 'CSV'

}) ;

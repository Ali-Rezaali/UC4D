// ────────────────────────────────────────────────────────────────────────────────
// [✱] VIIRS Overpass Resolver (VNP21A1D View Time)
//
//   VIIRS Daytime LST Overpass:
//
//   View_Time = Local Solar Hour of the Observation (Depends on Longitude)
//
//   TargetUTC = View_Time − lon / 15 (Invariant to Country's Specific Time Zones)
// ────────────────────────────────────────────────────────────────────────────────

// ──────────────────────────────
// [1] Settings, Config & Modules
// ──────────────────────────────

var Config          = require('users/alirezaali/UC4D:01 Configurations')                ;

var VT              = ee.ImageCollection('NASA/VIIRS/002/VNP21A1D').select('View_Time') ;

var Proj            = VT.first().projection()                                           ;

var ScaleM          = 926.625433055833                                                  ;

var DriftToleranceH = 0.25                                                              ; // Max Allowed Year-to-Year Spread of The Overpass (Hours)

var LonImg          = ee.Image.pixelLonLat().select('longitude')                        ;

// ─────────────────
// [2] Study Years
// ─────────────────

var YearsOf = function( City ) {

  var Seen = {} , Out = [] ;

  Config[ City + 'Seasons' ].forEach( function( S ) {

    var Y = Number( S.LCZYear ) ;

    if ( !Seen[ Y ] ) { Seen[ Y ] = true ; Out.push( Y ) ; }

  } ) ;

  return Out.sort( function( a , b ) { return a - b ; } ) ;

} ;

// ───────────────────────────────────────────────────────────────────────
// [3] Regional Median Of Solar Hour & Per-Pixel UTC (Per-Pixel Longitude)
// ───────────────────────────────────────────────────────────────────────

var Stat = function( SolarImg , Geom ) {

  var UTC = SolarImg.subtract( LonImg.divide( 15 ) ).rename( 'UTC' );

  return ee.Dictionary(

    SolarImg.rename( 'Solar' ).addBands( UTC ).reduceRegion( {

      reducer   : ee.Reducer.median() ,

      geometry  : Geom                ,

      crs       : Proj                ,

      scale     : ScaleM              ,

      maxPixels : 1e9

    } )

  ) ;

} ;

// ─────────────────────
// [4] Per-City Overpass
// ─────────────────────

var Compute = function( City , YearsOverride ) {

  var Geom   = Config[ City + 'HoldoutDomain' ].geometry()                                                              ;

  var Years  = YearsOverride || YearsOf( City )                                                                         ;

  var First  = Years[ 0 ] , Last = Years[ Years.length - 1 ]                                                            ;

  var Pooled = Stat( VT.filterDate( First + '-01-01' , ( Last + 1 ) + '-01-01' ).median() , Geom )                      ;

  var Yearly = ee.List( Years.map( function( Y ) {

    return Stat( VT.filterDate( Y + '-01-01' , ( Y + 1 ) + '-01-01' ).median() , Geom ).getNumber( 'UTC' )              ;

  } ) ) ;

  var Drift = ee.Number( Yearly.reduce( ee.Reducer.max() ) ).subtract( ee.Number( Yearly.reduce( ee.Reducer.min() ) ) ) ;

  var UTC   = Pooled.getNumber( 'UTC' )                                                                                 ;

  return ee.Dictionary( {

    City       : City                        ,

    Years      : Years                       ,

    SolarHour  : Pooled.getNumber( 'Solar' ) ,   // Local Solar Time Of Overpass (h)

    TargetUTC  : UTC.mod( 24 )               ,   // Exact UTC Hour (decimal) To Match ERA5 / GHCN-h

    UTCHour    : UTC.round().mod( 24 )       ,   // Nearest Integer Hour

    DayShift   : UTC.divide( 24 ).floor()    ,   // 0 = Same UTC Date As The Local Solar Date , 1 = Next UTC Date

    YearlyUTC  : Yearly                      ,

    DriftHours : Drift                       ,

    DriftOK    : Drift.lte( DriftToleranceH )

  } ) ;

} ;

// ───────────────
// [5] Public API
// ───────────────

exports.Compute = Compute ;

exports.Resolve = function( Callback , Cities ) {

  var List = Cities || Config.PrimaryTargets || Config.TargetCities ;

  var Dict = {}                                                     ;

  List.forEach( function( C ) { Dict[ C ] = Compute( C ) ; } )      ;

  ee.Dictionary( Dict ).evaluate( function( Result , Err ) {

    if ( Err ) { print( 'VIIRS Overpass Resolution Failed:' , Err ) ; return ; }

    Callback( Result ) ;

  } ) ;

} ;

// Linear-Interpolation Weights For Hourly UTC Data (ERA5): Value = (1−W)·H[Low] + W·H[High]

// High = 24 Means 00 UTC of The NEXT Date.

exports.HourWeights = function( TargetUTC ) {

  var Low = Math.floor( TargetUTC );

  return { Low : Low , High : Low + 1 , WeightHigh : TargetUTC - Low } ;

} ;

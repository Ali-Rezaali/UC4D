// ────────────────────────────
// [1] Settings & Configuration
// ────────────────────────────

var CityConfig       = { 'Tehran' : { CountryFolder : 'Iran' } , 'Singapore' : { CountryFolder : 'Singapore' } }         ;

var AgeSexStructures = [ { Sex : 'm' , Age : 65 , Label : 'Male 65' } , { Sex : 'f' , Age : 70 , Label : 'Female 70' } ] ;

var Config           = require('users/alirezaali/UC4D:01 Configurations')                                                ;

var Visualization    = Config.Visualization                                                                              ;

var WorldPopFolder   = Config.WorldPopFolder                                                                             ;

var TargetCities     = Object.keys(CityConfig)                                                                           ;

var VerifyYears      = [ 2020 , 2021 , 2022 , 2023 , 2024 , 2025 ]                                                       ;

var InspectYear      = 2025                                                                                              ;

// ─────────
// [2] Paths
// ─────────

var GetSpatialPath = function( CountryFolder , Year ) {

  return WorldPopFolder + '/' + CountryFolder + '/Spatial-Distribution/' + Year ;

} ;

var GetAgeSexPath = function( CountryFolder , Year ) {

  return WorldPopFolder + '/' + CountryFolder + '/Age-Sex-Structures/' + Year   ;

} ;

// ──────────────
// [3] Visualizer
// ──────────────

var RunVisualizer = function() {

  Map.clear() ;

  TargetCities.forEach(function(CityName) {

    var City = CityConfig[CityName];

    print( 'Inspecting: ' + CityName + ' (' + InspectYear + ')' ) ;

    // [3.1] Spatial Distribution (Population Density)

    var SpatialCol = ee.ImageCollection( GetSpatialPath( City.CountryFolder , InspectYear ) ) ;

    var SpatialN   = SpatialCol.size()                                                        ;

    SpatialN.evaluate(function( Count , Error ) {

      if ( Error ) {

        print( CityName + ' ' + InspectYear + ' Spatial Distributions : Error: ' + Error ) ;

      } else if ( Count === 0 ) {

        print( CityName + ' ' + InspectYear + ' Spatial Distributions : Empty, No layer added.' ) ;

      } else {

        print( CityName + ' ' + InspectYear + ' Spatial Distributions : Loaded ' + Count + ' Images.' ) ;

        Map.addLayer( SpatialCol.mosaic() , Visualization.PDVis , CityName + ' [' + InspectYear + '] Total Pop' , false ) ;

      }

    }) ;

    // [3.2] Age & Sex Structures (Subset)

    var AgeSexCol = ee.ImageCollection( GetAgeSexPath( City.CountryFolder , InspectYear ) );

    AgeSexStructures.forEach(function(Structure) {

      var Match = AgeSexCol.filter(

        ee.Filter.stringContains( 'system:index' , '_' + Structure.Sex + '_' + Structure.Age + '_' )

      ).first() ;

      Match.evaluate(function( Img , Error ) {

        if ( Error || !Img ) {

          print( CityName + ' ' + InspectYear + ' ' + Structure.Label + ' : Empty, No layer added.' ) ;

        } else {

          Map.addLayer( Match , Visualization.PDVis , CityName + ' [' + InspectYear + '] ' + Structure.Label , false ) ;

        }

      }) ;

    }) ;

  }) ;

} ;

// ───────────────────
// [4] Upload Verifier
// ───────────────────

var RunVerifier = function() {

  TargetCities.forEach(function(CityName) {

    var City = CityConfig[CityName];

    VerifyYears.forEach(function(Year) {

      // [4.1] Verify Spatial Distribution

      var SpatialCol = ee.ImageCollection( GetSpatialPath( City.CountryFolder , Year ) );

      SpatialCol.size().evaluate(function( Count , Error ) {

        if (Error) {

          print( CityName + ' ' + Year + ' Spatial Distributions : Missing or Error: ' + Error ) ;

        } else {

          print( CityName + ' ' + Year + ' Spatial Distributions : Found ' + Count + ' Images.' ) ;

        }

      }) ;

      // [4.2] Verify Age & Sex Structures

      var AgeSexCol = ee.ImageCollection( GetAgeSexPath( City.CountryFolder , Year ) );

      AgeSexCol.size().evaluate(function( Count , Error ) {

        if (Error) {

          print( CityName + ' ' + Year + ' Age/Sex Structures : Missing or Error: ' + Error ) ;

        } else {

          print( CityName + ' ' + Year + ' Age/Sex Structures : Found ' + Count + ' Images.' ) ;

        }

      }) ;

    }) ;

  }) ;

} ;

// ─────────────
// [5] Execution
// ─────────────

RunVisualizer() ;

RunVerifier()   ;
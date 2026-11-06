// ——————————————————————————
// [1] Variables and Settings
// ——————————————————————————

var Switch           = { BC : false , Samples : false , RF : false , Downscale : false , Validation : false } ;

var Config           = require('users/alirezaali/UC4D:01 Configurations')                    ;

var FeatureLib       = require('users/alirezaali/UC4D:04 Multi-Source Feature Library')      ;

var Overpass         = require('users/alirezaali/UC4D:Utilities/05 VIIRS Overpass Resolver') ;

var ERA5Config       = require('users/alirezaali/UC4D:06 ERA5-Land Correction Library')      ;

var Visualization    = Config.Visualization                                                  ;

var ScaleCube        = Config.ScaleCube                                                      ;

var CoarseResolution = Config.ERA5LandRes                                                    ;

var TargetResolution = Config.TargetResolution                                               ;

var RFNumberOfTrees  = Config.RF.numberOfTrees                                               ;

var RFMinLeafPop     = Config.RF.minLeafPopulation                                           ;

var RFBagFraction    = Config.RF.bagFraction                                                 ;

var TileScale        = Config.TileScale                                                      ;

var MaxPixels        = Config.MaxPixels                                                      ;

var NoData           = Config.NoData                                                         ;

var ResamplingMethod = Config.ResamplingMethod                                               ;

// ———————————————————
// [2] Spatial Domains
// ———————————————————

var CityConfigs = Config.CityConfigs;

CityConfigs.forEach(function(City) {

  City.HoldoutDomain  = Config[ City.Name + 'HoldoutDomain'  ]  ;

  City.TrainingDomain = Config[ City.Name + 'TrainingDomain' ]  ;

  City.Seasons        = Config[ City.Name + 'Seasons'        ]  ;

  City.FullDomain     = Config[ City.Name + 'CompleteDomain' ]  ;

}) ;

// ————————————————————————————
// [3] Visualization Parameters
// ————————————————————————————

var T2MVisParams   = Visualization.T2MVisParams ;

var WSVisParams    = Visualization.WSVisParams  ;

var SRVisParams    = Visualization.SRVisParams  ;

var RHVisParams    = Visualization.RHVisParams  ;

var SMVisParams    = Visualization.SMVisParams  ;

// —————————————————————
// [4] Calculate Physics
// —————————————————————

var CalculatePhysics = function(img, source) {

  // [4.1] Wind Speed (WS) : WS = sqrt(u² + v²)
  
  var u                = img.select('u_component_of_wind_10m')                                ;
   
  var v                = img.select('v_component_of_wind_10m')                                ;
  
  var WindSpeed        = u.pow(2).add(v.pow(2)).sqrt().rename('WS')                           ;

  // [4.2] Relative Humidity (RH) (August-Roche-Magnus Approximation)
  
  var T                = img.select('temperature_2m').subtract(273.15)                        ;
  
  var Td               = img.select('dewpoint_temperature_2m').subtract(273.15)               ;
  
  var Numerator        = ee.Image(17.625).multiply(Td).divide(ee.Image(243.04).add(Td)).exp() ;
  
  var Denominator      = ee.Image(17.625).multiply(T).divide(ee.Image(243.04).add(T)).exp()   ;
  
  var RelativeHumidity = ee.Image(100).multiply(Numerator.divide(Denominator)).rename('RH')   ;
  
  // [4.3] Solar Radiation & Soil Moisture (SR & SM)
  
  var SolarName        = (source === 'Land') ? 'surface_solar_radiation_downwards_hourly' : 'surface_solar_radiation_downwards' ;
  
  var SolarRadiation   = img.select(SolarName).rename('SR')                                                                     ;
  
  var SoilMoisture     = img.select('volumetric_soil_water_layer_1').rename('SM')                                               ;

  return img.select('temperature_2m').rename('T2M')
    
    .addBands(img.select('dewpoint_temperature_2m').rename('D2M'))
    
    .addBands(WindSpeed)
    
    .addBands(RelativeHumidity)
    
    .addBands(SolarRadiation)
    
    .addBands(SoilMoisture);

};

var VariablesToDownscale = [ 'T2M' , 'WS' , 'SM' ] ;

var VariablesToResample  = [ 'D2M' ] ;

// ————————————————————
// [5] Shared Utilities
// ————————————————————

// [5.1] ERA5-Land Projection Retrieval

var GetERA5Projection = function( Domain , StartDate , EndDate , TargetUTC ) {

  return ee.ImageCollection( 'ECMWF/ERA5_LAND/HOURLY' )

      .filterBounds( Domain )

      .filterDate( StartDate , EndDate )

      .filter( ee.Filter.calendarRange( TargetUTC , TargetUTC , 'hour' ) )

      .first()

      .select( 'temperature_2m' )

      .projection() ;

};

// [5.2] Seasonal Bias Corrected Cube Retrieval

var GetSeasonalBCMean = function( BCAssetPath ) {

  var BCMultiBand = ee.Image( BCAssetPath ) ;

  var T2M = BCMultiBand.select( 'd.*_T2M' ).reduce( ee.Reducer.mean() ).rename( 'T2M' ) ;

  var WS  = BCMultiBand.select( 'd.*_WS'  ).reduce( ee.Reducer.mean() ).rename( 'WS'  ) ;

  var D2M = BCMultiBand.select( 'd.*_D2M' ).reduce( ee.Reducer.mean() ).rename( 'D2M' ) ;

  return T2M.addBands( WS ).addBands( D2M ) ;

};

// [5.3] Random Forest Model Loader

var LoadRFModel = function( CityName , SeasonLabel , VarName ) {

  var AssetID = Config.AssetRoot + '/DS-ERA5/RF-Models/' + CityName + '-' + SeasonLabel + '-RF-' + VarName ;

  return ee.Classifier.load( AssetID ) ;

};

// [5.4] Predictor Name Retrieval

var GetPredictorNames = function( VarName ) {

  if ( VarName === 'T2M' ) return Config.T2MPredictors ;

  if ( VarName === 'WS'  ) return Config.WSPredictors  ;

  if ( VarName === 'SM'  ) return Config.SMPredictors  ;

  return [] ;

};

// [5.5] ERA5-Land Mean Composite Generator 

var PrepareERA5Mean = function( Domain , StartDate , EndDate , TargetUTC ) {

  var EndPlus = ee.Date( EndDate ).advance( 1 , 'day' ) ;

  var ERA5Land = ee.ImageCollection('ECMWF/ERA5_LAND/HOURLY')

      .select([ 'temperature_2m' , 'volumetric_soil_water_layer_1' , 'surface_solar_radiation_downwards_hourly' , 'dewpoint_temperature_2m' , 'v_component_of_wind_10m' , 'u_component_of_wind_10m' ])

      .filterBounds(Domain)

      .filterDate(StartDate, EndPlus)

      .filter(ee.Filter.calendarRange(TargetUTC, TargetUTC, 'hour'))

      .map(function(img){ return CalculatePhysics(img, 'Land'); });

  var ERA5 = ee.ImageCollection('ECMWF/ERA5/HOURLY')

      .select([ 'temperature_2m' , 'volumetric_soil_water_layer_1' , 'surface_solar_radiation_downwards' , 'dewpoint_temperature_2m' , 'v_component_of_wind_10m' , 'u_component_of_wind_10m' ])

      .filterBounds(Domain)

      .filterDate(StartDate, EndPlus)

      .filter(ee.Filter.calendarRange(TargetUTC, TargetUTC, 'hour'))

      .map(function(img){ return CalculatePhysics(img, 'Global'); });

  return ERA5Land.mean().unmask(ERA5.mean());

};

// [5.6] Coarse Product Loader (CORP)

var LoadCORP = function( CityName , SeasonLabel , Region ) {

  var BaseCoarse    = Config.AssetRoot + '/STC/CORP/' + CityName                           ;

  var StaticCoarse  = ee.Image(BaseCoarse + '/Static/'  + CityName)                        ;

  var DynamicCoarse = ee.Image(BaseCoarse + '/Dynamic/' + CityName + '-' + SeasonLabel)    ;

  return StaticCoarse.addBands(DynamicCoarse).clip(Region)                                 ;

};

// [5.7] Fine Predictor Loader (FINP)

var LoadFINP = function( CityName , SeasonLabel , Region ) {

  var BaseFine    = Config.AssetRoot + '/STC/FINP/' + CityName                             ;

  var StaticFine  = ee.Image( BaseFine + '/Static/'  + CityName )                          ;

  var DynamicFine = ee.Image( BaseFine + '/Dynamic/' + CityName + '-' + SeasonLabel )      ;
 
  return Config.UnscaleCube( StaticFine.addBands( DynamicFine ) ).clip( Region )           ;

} ;

// ——————————————————————————
// [6] Random Forest Training
// ——————————————————————————

function TrainAndExportERARFModels( Season , TrainRegion , CityName ) {

  // [6.1] Spatiotemporal Setup

  var SeasonLabel    = Season.label                           ;
 
  var SeasonDict     = ee.Dictionary(Season)                  ;
 
  var StartDate      = ee.Date(SeasonDict.get('start'))       ;
 
  var EndDate        = ee.Date(SeasonDict.get('end'))         ;
 
  var TargetUTC      = ee.Number(SeasonDict.get('TargetUTC')) ;
  
  // [6.2] Coarse Predictors & Seasonal Target

  var CoarseCombined   = LoadCORP( CityName , SeasonLabel , TrainRegion )                               ;
  
  var ERA5Projection   = GetERA5Projection( TrainRegion , StartDate , EndDate , TargetUTC )             ;
  
  var FinalMean        = PrepareERA5Mean( TrainRegion , StartDate , EndDate , TargetUTC )               ;

  var BCAssetPath      = Config.AssetRoot + '/BC-ERA5/' + CityName + '/' + CityName + '-' + SeasonLabel ;
  
  FinalMean            = FinalMean.addBands( GetSeasonalBCMean( BCAssetPath ) , null , true )           ;

  var AssetPath        = Config.AssetRoot + '/Samples/ERA5/' + CityName                                 ;
  
  var TrainingGrid     = ee.FeatureCollection( AssetPath )                                              ;

  var VariablesToTrain = [ 'T2M' , 'WS' , 'SM' ]                                                        ;

  // [6.3] Train Per Variable

  VariablesToTrain.forEach(function(VarName) {

    var PredictorNames   = GetPredictorNames( VarName )          ;
 
    var Predictors1km    = CoarseCombined.select(PredictorNames) ;

    var PredictorsCoarse = Predictors1km

        .reduceResolution({ reducer: ee.Reducer.mean(), maxPixels: 512, bestEffort: true })

        .reproject({ crs: ERA5Projection }) ;

    var TargetLowRes    = FinalMean.select(VarName).rename('Target') ;

    var TrainingImage   = PredictorsCoarse.addBands(TargetLowRes)    ;

    var Samples = TrainingImage.sampleRegions({
 
      collection : TrainingGrid     ,
 
      scale      : CoarseResolution ,
 
      tileScale  : TileScale        ,
 
      geometries : false
 
    });

    // [6.4] Random Forest Hyperparameters
    
    var p = PredictorNames.length            ;
 
    var variablesPerSplit = Math.ceil(p / 3) ;
 
    var RF = ee.Classifier.smileRandomForest({

      numberOfTrees     : RFNumberOfTrees   ,

      minLeafPopulation : RFMinLeafPop      ,

      variablesPerSplit : variablesPerSplit ,

      maxNodes          : null              ,

      bagFraction       : RFBagFraction     ,

      seed              : Config.RandomSeed

    }).setOutputMode('REGRESSION').train({

      features          : Samples   ,

      classProperty     : 'Target'  ,

      inputProperties   : PredictorsCoarse.bandNames()

    });

    // [6.5] Export Classifier

    var AssetID = Config.AssetRoot + '/DS-ERA5/RF-Models/' + CityName + '-' + SeasonLabel + '-RF-' + VarName;
 
    Export.classifier.toAsset({
  
      classifier  : RF                                               ,
  
      description : CityName + '-' + SeasonLabel + '-RF-' + VarName  ,
  
      assetId     : AssetID
  
    }) ;
  
  }) ;

}

// ——————————————————————
// [7] GHCNh Station Data
// ——————————————————————

var GHCNhStations = ee.FeatureCollection(Config.AssetRoot + '/GHCNh/GHCNh-Station-List') ;

var GHCNStations  = GHCNhStations 

  .filter(ee.Filter.notNull([ 'LONGITUDE' , 'LATITUDE' ]))

  .map(function(feature) {

    var Longitude = ee.Number(feature.getNumber('LONGITUDE')) ;

    var Latitude  = ee.Number(feature.getNumber('LATITUDE'))  ;

    return feature

      .setGeometry(ee.Geometry.Point([ Longitude , Latitude ]))

      .set('GHCNID', feature.get('GHCN_ID')) ;

  }) ;

// —————————————————————————————————————————
// [8] Point‑Based Fine Predictor Generation
// —————————————————————————————————————————

// Stations Outside SUHI Domain Require On-The-Fly Fine Predictor Generation Since 10m Cubes Are Only Exported For The SUHI Domain, Not The Complete Domain.

var GenerateStationFinePredictors = function( CityName , SeasonLabel , LCZYear , StartDate , EndDate , Stations ) {

  var BufferGeom        = Stations.geometry().buffer(30)                                                                                                                     ;

  var CoarseDynamicPath = Config.AssetRoot + '/STC/CORP/' + CityName + '/Dynamic/' + CityName + '-' + SeasonLabel                                                            ;

  var CoarsePopDensity  = ee.Image(CoarseDynamicPath).select('PD')                                                                                                           ;

  var Cube              = FeatureLib.SpatiotemporalCube( BufferGeom , ee.Date(StartDate) , ee.Date(EndDate) , CityName , LCZYear , false , false , null , CoarsePopDensity ) ;

  return ScaleCube(Cube).clip(BufferGeom)                                                                                                                                    ;

};

var GenerateStationDSConstants = function( CityName , SeasonLabel , SeasonDict , Stations , LCZYear ) {

  var StartDate = SeasonDict.get('start')                                                                     ;
 
  var EndDate   = SeasonDict.get('end')                                                                       ;

  var FinePred  = GenerateStationFinePredictors(CityName, SeasonLabel, LCZYear, StartDate, EndDate, Stations) ;
    
  var T2MModel  = LoadRFModel( CityName , SeasonLabel , 'T2M' )                                               ;
  
  var WSModel   = LoadRFModel( CityName , SeasonLabel , 'WS'  )                                               ;
  
  var FineProj  = FinePred.select('Elevation').projection()                                                   ;
  
  var T2MBase = FinePred
  
      .select( GetPredictorNames( 'T2M' ) )
  
      .classify( T2MModel )
  
      .rename( 'T2M_Base' )
  
      .setDefaultProjection( FineProj ) ;
  
  var WSBase = FinePred
  
      .select( GetPredictorNames( 'WS' ) )
  
      .classify( WSModel )
  
      .rename( 'WS_Base' )
  
      .setDefaultProjection( FineProj ) ;
      
  var TargetUTC       = SeasonDict.getNumber('TargetUTC') ;
  
  var ERA5Projection  = GetERA5Projection( Stations.geometry() , StartDate , EndDate , TargetUTC ) ;

  var CoarseBaseT2M   = T2MBase

    .reduceResolution({ reducer: ee.Reducer.mean() , maxPixels: 1024 , bestEffort: true })

    .reproject({ crs: ERA5Projection })

    .rename('CoarseBaseT2M');

  var CoarseBaseWS = WSBase

    .reduceResolution({ reducer: ee.Reducer.mean() , maxPixels : 1024 , bestEffort : true })

    .reproject({ crs: ERA5Projection })

    .rename('CoarseBaseWS');
    
  var DSConstants = T2MBase
    
    .addBands(WSBase)
    
    .addBands(CoarseBaseT2M)
    
    .addBands(CoarseBaseWS)
    
    .sampleRegions({
    
      collection  : Stations           ,
    
      scale       : 10                 ,
     
      tileScale   : Config.TileScale   ,
    
      geometries  : false
    
    })
  
    .map(function(f) {
  
      return f.set( 'GHCN_ID' , f.get('GHCNID') ) ;
  
    });

  return DSConstants;

};

// ——————————————————————————————
// [9] Training Samples Generator
// ——————————————————————————————

var GenerateSamples = function( TrainingDomain , CityName , ExcludeStations ) {

  ExcludeStations = ExcludeStations || false ;

  var AssetPath = Config.AssetRoot + '/Samples/ERA5/' + CityName ;

  var ERA5LandImage = ee.ImageCollection( 'ECMWF/ERA5_LAND/HOURLY' )

      .filterBounds( TrainingDomain )

      .select( 'temperature_2m' )

      .first()

      .clip( TrainingDomain ) ;

  var RandomSamples = ee.Image.random().multiply( 1e6 ).int() ;

  if ( ExcludeStations ) {

    var StationRaster = ee.Image( 0 )

        .paint( GHCNStations , 1 )

        .reproject( ERA5LandImage.select( 'temperature_2m' ).projection() ) ;

    var Mask = StationRaster.eq( 0 ) ;

    RandomSamples = RandomSamples.updateMask( Mask ) ;

  }

  var PointCollection = RandomSamples

      .reproject( ERA5LandImage.select( 'temperature_2m' ).projection() )

      .sample({ region : TrainingDomain , geometries : true }) ;

  Export.table.toAsset({

    collection  : PointCollection                     ,

    description : CityName + '-ERA5-Training-Samples' ,

    assetId     : AssetPath                           ,

    overwrite   : true

  }) ;

};

// ———————————————————————————————
// [10] Spatiotemporal Downscaling
// ———————————————————————————————

var ERA5Downscaling = function( Season , TrainRegion , PredictRegion ) {
  
    var CityName       = Season.City                    ;
     
    var SeasonLabelStr = Season.label                   ;
  
    Season             = ee.Dictionary(Season)          ;
  
    var TargetCRS      = ee.String(Season.get('crs'))   ;
  
    var StartDate      = ee.Date(Season.get('start'))   ;
    
    var EndDate        = ee.Date(Season.get('end'))     ;
    
    var SeasonLabel    = ee.String(Season.get('label')) ;
  
    // [10.1] FINP / CORP Assembly

    var PredictGeometry = ee.FeatureCollection(PredictRegion).geometry()                                ;
     
    var FINP            = LoadFINP( CityName , SeasonLabelStr , PredictGeometry )                       ;
   
    // [10.2] Prepare ERA5 Collections (Land & Global)

    var TargetUTCHour   = Season.getNumber('TargetUTC')                                                 ;
  
    var FinalMean       = PrepareERA5Mean( PredictGeometry , StartDate , EndDate , TargetUTCHour )      ;
  
    // [10.3] Capture Projection (~ 11.1 km)
    
    var ERA5Projection  = GetERA5Projection( PredictGeometry , StartDate , EndDate , TargetUTCHour )    ;

    // [10.4] Bias Correction

    var BCAssetPath = Config.AssetRoot + '/BC-ERA5/' + CityName + '/' + CityName + '-' + SeasonLabelStr ;
    
    FinalMean = FinalMean.addBands( GetSeasonalBCMean( BCAssetPath ) , null , true )                    ;  
   
    // [10.5] Random Forest Downscaling

    var S2Projection     = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED').filterBounds( PredictGeometry ).first().select( 'B4' ).projection() ; 
  
    var DSImages         = VariablesToDownscale.map(function(VarName) {
  
    var PredictorNames   = GetPredictorNames( VarName )                       ;
  
    var PredictorsFine   = FINP.select(PredictorNames)                        ;
  
    var TargetLowRes     = FinalMean.select(VarName)                          ;
    
    var ShortName        = VarName                                            ;
   
    var RF               = LoadRFModel( CityName , SeasonLabelStr , VarName ) ;

    var Model            = PredictorsFine
  
                        .select( PredictorNames )
                    
                        .classify( RF )
                    
                        .setDefaultProjection( S2Projection ) ;
  
    var DownscaledInitial = Model.rename( ShortName ) ;
  
    var FinalDS ;
    
    // [10.6] Two Pass Residual Correction (TPRC)

    if (VarName !== 'SM') {
    
      FinalDS = ERA5Config.ApplyTPRC( DownscaledInitial , TargetLowRes , ERA5Projection , TargetCRS , TargetResolution ).rename(ShortName) ;
  
    } else {
  
      FinalDS = DownscaledInitial.rename(ShortName);
  
    }
  
    return FinalDS ;
  
    } ) ;
  
    // [10.7] Resample Targets

    var ResampledImages = VariablesToResample.map(function(VarName) {
      
      var Target        = FinalMean.select(VarName).setDefaultProjection(ERA5Projection) ; 
      
      return Target
      
        .resample(ResamplingMethod)
        
        .reproject({ crs : TargetCRS , scale : TargetResolution })
        
        .rename(VarName) ;
  
    }) ;
  
    // —————————————————————
    // [10.8] Physics Blocks
    // —————————————————————
    
    var DSStack = ee.Image.cat(DSImages)        ;
    
    var RSStack = ee.Image.cat(ResampledImages) ;
  
    // [A] Geometrics SSRD Downscaling
    
    var CoarseSolar = FinalMean.select('SR')    ;
  
    // [A.1] Temporal Midpoint of Target Composite Window
     
    var MidDate = StartDate.advance( EndDate.difference( StartDate , 'days' ).divide( 2 ) , 'days' ) ;
    
    // [A.2] Region Center Latitude Extracted in Radians
     
    var Centroid = PredictGeometry.centroid(10) ;
     
    var LatRad   = ee.Number(Centroid.coordinates().get(1)).multiply(Math.PI/180) ;
    
    // [A.3] (Approximate Seasonal Solar Declination)
    
    var DOY            = MidDate.getRelative('day', 'Year') ;
     
    var DeclinationRad = DOY.subtract(81).multiply(2 * Math.PI / 365).sin().multiply(23.45 * Math.PI / 180) ;
    
    // [A.4] Solar Hour From The Derived UTC Hour + City Longitude

    var LonDeg           = ee.Number( Centroid.coordinates().get( 0 ) )                ;
    
    var TargetUTCDecimal = Season.getNumber('TargetUTC')                               ;
  
    var SolarHour        = TargetUTCDecimal.add( LonDeg.divide( 15 ) )                 ;    
  
    var HourAngleRad     = SolarHour.subtract( 12 ).multiply( 15 * Math.PI / 180 )     ;
    
    // [A.5] Solar Elevation Via Spherical Trigonometry
    
    var SinElev      = LatRad.sin().multiply(DeclinationRad.sin()).add(LatRad.cos().multiply(DeclinationRad.cos()).multiply(HourAngleRad.cos())) ;
    
    var SunElevation = SinElev.asin().multiply( 180 / Math.PI ) ;
  
    // [A.6] Solar Azimuth Converted To North-Based Convention
     
    var y                  = DeclinationRad.cos().multiply(HourAngleRad.sin())                                                                              ;
     
    var x                  = LatRad.sin().multiply(DeclinationRad.cos()).multiply(HourAngleRad.cos()).subtract(LatRad.cos().multiply(DeclinationRad.sin())) ;
             
    var AzimuthFromSouth   = y.atan2(x).multiply(180/Math.PI)                                                                                               ;
     
    var SunAzimuth         = AzimuthFromSouth.add(180)                                                                                                      ;
     
    var DEM                = FINP.select('Elevation')                                                                                                       ;
     
    var HillShade          = ee.Terrain.hillshade( DEM , SunAzimuth , SunElevation )                                                                        ;
    
    var SunElevationRad    = ee.Number(SunElevation).multiply(Math.PI / 180)                                                                                ;
    
    var FlatGroundValue    = SunElevationRad.sin().multiply(255)                                                                                            ;
     
    var HillShadeModulator = HillShade.divide(FlatGroundValue)                                                                                              ;
    
    // [A.7] Spatial Reprojection and Illumination Modulation
    
    var SolarDS = CoarseSolar.setDefaultProjection(ERA5Projection)
     
        .resample(ResamplingMethod)
        
        .reproject({ crs : TargetCRS , scale : TargetResolution })
        
        .multiply(HillShadeModulator)
        
        .rename('SR');
  
    // [B] Relative Humidity Calculation (Downscaled)
  
    var TempDS      = ee.Image(DSStack.select('T2M'))                                                  ;
    
    var DewRS       = ee.Image(RSStack.select('D2M'))                                                  ;
    
    var TC          = TempDS                                                                           ;
    
    var TDC         = DewRS                                                                            ;
     
    var Numerator   = ee.Image(17.625).multiply(TDC).divide(ee.Image(243.04).add(TDC)).exp()           ;
  
    var Denominator = ee.Image(17.625).multiply(TC).divide(ee.Image(243.04).add(TC)).exp()             ;
    
    var RHDS        = ee.Image(100).multiply(Numerator.divide(Denominator)).clamp(0, 100).rename('RH') ;
    
    // ——————————————————————————————
    // [10.9] ERA5/-Land Raster Stack
    // ——————————————————————————————
  
    var ERA5Composite = DSStack
    
      .addBands(RSStack)
      
      .addBands(SolarDS) 
      
      .addBands(RHDS)    
    
      .set({ 'Season' : SeasonLabel , 'StartDate' : StartDate.format() , 'EndDate' : EndDate.format() })                  ;
  
    return ee.Dictionary({ 'image' : ERA5Composite , 'ERA5Projection' : ERA5Projection , 'S2Projection' : S2Projection }) ;

};

// ———————————————————————————————————
// [11] Downscaling Execution & Export
// ———————————————————————————————————

function RunDownscaling( TrainDomain, HoldoutDomain , SeasonList , RegionName ) {
  
  SeasonList.forEach(function(s){
  
    var HoldoutGeom       = HoldoutDomain.geometry()                                    ;

    var ResultDictionary  = ERA5Downscaling( s , TrainDomain , HoldoutDomain )          ;

    var ERA5Composite     = ee.Image(ResultDictionary.get('image')).clip(HoldoutGeom)   ;
 
    var SeasonLabel       = s.label                                                     ;
 
    var ExportName        = RegionName + '-' + SeasonLabel                              ;

    Export.image.toAsset({

      assetId     : Config.AssetRoot + '/DS-ERA5/' + RegionName + '/' + ExportName ,
     
      description : ExportName + '-Asset'                                          ,

      image       : ERA5Composite                                                  ,

      region      : HoldoutGeom                                                    ,

      scale       : Config.TargetResolution                                        ,
      
      crs         : s.crs                                                          ,

      maxPixels   : MaxPixels                                                      ,

      overwrite   : true

    } ) ;

  } ) ;

}

// ————————————————————————————————————————————————————————————————————
// [12] Validation Export (Raw ERA5-Land + DS ERA5-Land + BC ERA5-Land)
// ————————————————————————————————————————————————————————————————————

function ExportDailyValidation(StationCollection, FullDomain, SeasonList, CityName, HoldoutDomain) {

  HoldoutDomain        = HoldoutDomain || FullDomain;

  var StationsInDomain = StationCollection.filterBounds(FullDomain);

  SeasonList.forEach(function(Season) {

    var s           = ee.Dictionary(Season)                  ;

    var SeasonLabel = Season.label                           ;

    var StartDate   = ee.Date(s.get('start'))                ;

    var EndDate     = ee.Date(s.get('end'))                  ;

    var TargetUTC   = s.getNumber('TargetUTC')               ;

    var ObsPath     = Config.AssetRoot + '/GHCNh/' + CityName ;

    var ObsTable    = ee.FeatureCollection(ObsPath)
  
      .filter(ee.Filter.eq('Season', SeasonLabel))
  
      .filter(ee.Filter.eq('Hour_UTC', TargetUTC))
  
      .filter(ee.Filter.notNull([ 'T2M' , 'WS10M' , 'D2M' ]))
  
      .map(function(o) {
  
        return o.set('GHCN_ID', o.get('GHCNID'))
  
                .set('DateStr', ee.String(o.get('Date')))
  
                .set('ObsT2M', o.get('T2M'))
  
                .set('ObsWS',  o.get('WS10M'))
  
                .set('ObsD2M', o.get('D2M'));
  
      });

    var HoldoutGeom = HoldoutDomain.geometry();
    
    var StationsWithFlag = StationsInDomain.map(function(f) {
   
      var pt = ee.Feature(f).geometry();
   
      return f.set('IN_HOLDOUT', pt.intersects(HoldoutGeom)) ;
   
    });
    
    // ─────────────────────────────────────────────
    // Deduplicate Stations and Build Base Constants
    // ─────────────────────────────────────────────
    
    var HoldoutStationsAll = StationsWithFlag.filter( ee.Filter.eq( 'IN_HOLDOUT' , true  ) )                                                                ;
    
    var OutsideStationsAll = StationsWithFlag.filter( ee.Filter.eq( 'IN_HOLDOUT' , false ) )                                                                ;
    
var DedupedHoldout     = ERA5Config.DeduplicateStations( HoldoutStationsAll , ObsTable , SeasonLabel , StartDate , EndDate , TargetUTC ) ;

var DedupedOutside     = ERA5Config.DeduplicateStations( OutsideStationsAll , ObsTable , SeasonLabel , StartDate , EndDate , TargetUTC ) ;    

    var SelectedHoldoutIDs = DedupedHoldout.aggregate_array( 'GHCN_ID' )                                                                                    ;
    
    var SelectedOutsideIDs = DedupedOutside.aggregate_array( 'GHCN_ID' )                                                                                    ;
    
    var HoldoutStations    = HoldoutStationsAll.filter( ee.Filter.inList( 'GHCN_ID' , SelectedHoldoutIDs ) )                                                ;
    
    var OutsideStations    = OutsideStationsAll.filter( ee.Filter.inList( 'GHCN_ID' , SelectedOutsideIDs ) )                                                ;
    
    var DedupedStations    = HoldoutStations.merge( OutsideStations )                                                                                       ;
    
    var ERA5Projection     = GetERA5Projection( FullDomain , StartDate , EndDate.advance( 1 , 'day' ) , TargetUTC )                                         ;
    
    var DSAssetPath        = Config.AssetRoot + '/DS-ERA5/' + CityName + '/' + CityName + '-' + SeasonLabel ;
    
    var DSAsset            = ee.Image( DSAssetPath ).clip( HoldoutDomain )                                                                                  ;
    
    var BaseT2M            = DSAsset.select( 'T2M' )                                                                                                        ;
    
    var BaseWS             = DSAsset.select( 'WS'  )                                                                                                        ;
    
    var CoarseBaseT2M = BaseT2M
    
        .reduceResolution({ reducer : ee.Reducer.mean() , maxPixels : 1024 , bestEffort : true })
    
        .reproject({ crs : ERA5Projection })
    
        .rename( 'CoarseBaseT2M' ) ;
    
    var CoarseBaseWS = BaseWS
    
        .reduceResolution({ reducer : ee.Reducer.mean() , maxPixels : 1024 , bestEffort : true })
    
        .reproject({ crs : ERA5Projection })
    
        .rename( 'CoarseBaseWS' ) ;
    
    var HoldoutConstants = BaseT2M
    
        .addBands( BaseWS )
    
        .addBands( CoarseBaseT2M )
    
        .addBands( CoarseBaseWS )
    
        .sampleRegions({
    
            collection : HoldoutStations  ,
    
            scale      : 10               ,
    
            tileScale  : Config.TileScale ,
    
            geometries : false
    
        })
    
        .map( function( f ) {
    
            return f
    
                .set( 'GHCN_ID'       , f.get( 'GHCNID' ) )
    
                .set( 'T2M_Base'      , f.get( 'T2M' ) )
    
                .set( 'WS_Base'       , f.get( 'WS' ) )
    
                .set( 'CoarseBaseT2M' , f.get( 'CoarseBaseT2M' ) )
    
                .set( 'CoarseBaseWS'  , f.get( 'CoarseBaseWS' ) ) ;
    
        }) ;
    
    var OutsideConstants = GenerateStationDSConstants( CityName , SeasonLabel , s , OutsideStations , Season.LCZYear ) ;
    
    var BaseConstants    = HoldoutConstants.merge( OutsideConstants )                                                  ;
    
    // ── ERA5 collections for daily raw/BC ──
    
    var ERA5Land = ee.ImageCollection( 'ECMWF/ERA5_LAND/HOURLY' )
    
        .filterBounds( FullDomain )
    
        .filterDate( StartDate , EndDate.advance( 1 , 'day' ) )
    
        .filter( ee.Filter.calendarRange( TargetUTC , TargetUTC , 'hour' ) ) ;
    
    var ERA5Global = ee.ImageCollection( 'ECMWF/ERA5/HOURLY' )
    
        .filterBounds( FullDomain )
    
        .filterDate( StartDate , EndDate.advance( 1 , 'day' ) )
    
        .filter( ee.Filter.calendarRange( TargetUTC , TargetUTC , 'hour' ) ) ;
    
    var BCCube     = ee.Image( Config.AssetRoot + '/BC-ERA5/' + CityName + '/' + CityName + '-' + SeasonLabel ) ;
    
    var DayCount   = EndDate.difference( StartDate , 'day' ).add( 1 )                                           ;
    
    var DayOffsets = ee.List.sequence( 0 , DayCount.subtract( 1 ) )                                             ;
    
    var AllRows = ee.FeatureCollection( DayOffsets.map( function( off ) {
    
        var date       = StartDate.advance( off , 'day' )              ;
    
        var DateStr    = date.format( 'YYYYMMdd' )                     ;
    
        var DateDash   = date.format( 'YYYY-MM-dd' )                   ;
    
        var DayEnd     = date.advance( 1 , 'day' )                     ;
    
        var LandMean   = ERA5Land.filterDate( date , DayEnd ).mean()   ;
    
        var GlobalMean = ERA5Global.filterDate( date , DayEnd ).mean() ;
    
        var RawT2M = LandMean.select( 'temperature_2m' )
    
            .unmask( GlobalMean.select( 'temperature_2m' ) )
    
            .subtract( 273.15 )
    
            .rename( 'RawT2M' ) ;
    
        var RawD2M = LandMean.select( 'dewpoint_temperature_2m' )
    
                             .unmask( GlobalMean.select( 'dewpoint_temperature_2m' ) )
                      
                             .subtract( 273.15 )
                      
                             .rename( 'RawD2M' ) ;
                      
        var u            = GlobalMean.select( 'u_component_of_wind_10m' )                                                                                ;
    
        var v            = GlobalMean.select( 'v_component_of_wind_10m' )                                                                                ;
    
        var RawWS        = u.pow( 2 ).add( v.pow( 2 ) ).sqrt().rename( 'RawWS' )                                                                         ;
    
        var BCPrefix     = ee.String( 'd' ).cat( DateStr )                                                                                               ;
    
        var BCDay        = BCCube.select( [ BCPrefix.cat( '_T2M' ) , BCPrefix.cat( '_WS' ) , BCPrefix.cat( '_D2M' ) ] , [ 'BCT2M' , 'BCWS' , 'BCD2M' ] ) ;
    
        var DailyImage   = RawT2M.addBands( RawWS ).addBands( RawD2M ).addBands( BCDay ).setDefaultProjection( ERA5Projection ) ;
    
        var DailySamples = DailyImage.sampleRegions({
    
            collection : DedupedStations  ,
    
            scale      : CoarseResolution ,
    
            tileScale  : Config.TileScale ,
    
            geometries : false
    
        }) ;
    
        var WithBase = ee.Join.inner().apply( DailySamples , BaseConstants , ee.Filter.equals({ leftField : 'GHCN_ID' , rightField : 'GHCN_ID' }) ).map( function( f ) {
    
            var primary   = ee.Feature( f.get( 'primary' ) )   ;
    
            var secondary = ee.Feature( f.get( 'secondary' ) ) ;
    
            var DST2M = ee.Number( secondary.get( 'T2M_Base' ) )
    
                .add( ee.Number( primary.get( 'BCT2M' ) )
    
                    .subtract( ee.Number( secondary.get( 'CoarseBaseT2M' ) ) ) ) ;
    
            var DSWS = ee.Number( secondary.get( 'WS_Base' ) )
    
                .add( ee.Number( primary.get( 'BCWS' ) )
    
                    .subtract( ee.Number( secondary.get( 'CoarseBaseWS' ) ) ) ) ;
    
            return primary
    
                .set( 'DST2M'   , DST2M )
    
                .set( 'DSWS'    , DSWS )
    
                .set( 'DateStr' , DateDash )
    
                .set( 'Season'  , SeasonLabel )
    
                .set( 'GHCN_ID' , primary.get( 'GHCN_ID' ) ) ;
    
        }) ;
    
        return WithBase ;
    
    }) ).flatten() ;

    // Join With Observations
    
    var JoinFilter = ee.Filter.and(
    
      ee.Filter.equals({ leftField : 'GHCN_ID' , rightField : 'GHCN_ID' }) ,
    
      ee.Filter.equals({ leftField : 'DateStr' , rightField : 'DateStr' })
    
    );
    
    var WithObs = ee.Join.inner().apply( AllRows , ObsTable , JoinFilter ).map(function(f) {
    
      var Primary   = ee.Feature( f.get('primary')   )                               ;
    
      var Secondary = ee.Feature( f.get('secondary') )                               ;
    
      return Primary.copyProperties( Secondary , [ 'ObsT2M' , 'ObsWS' , 'ObsD2M' ] ) ;
    
    });

    Export.table.toDrive({
    
      collection     : WithObs                                                                  ,
     
      description    : CityName + '-' + SeasonLabel + '-ERA5-Validation'                        ,
    
      folder         : 'UC4D/ERA5/02 Results/Validation/' + CityName + '/01 Validation Results' ,

      fileNamePrefix : CityName + '-' + SeasonLabel + '-ERA5-Validation'                        ,
    
      fileFormat     : 'CSV'                                                                    ,
    
      selectors      : [ 'GHCN_ID' , 'DateStr' , 'Season' , 'RawT2M' , 'RawWS' , 'RawD2M' , 'BCT2M' , 'BCWS' , 'BCD2M' , 'DST2M' , 'DSWS' , 'ObsT2M' , 'ObsWS' , 'ObsD2M' ]
    
    });

  });
  
}

// ——————————————————
// [13] Visualization
// ——————————————————

var VisToggles = {

  Original : { T2M : true , WS : false , SR : false , RH : false , SM : false } ,

  BC       : { T2M : false , WS : false , D2M : false                          } ,

  DS       : { T2M : false , WS : false , SR : false , RH : false , SM : false }

} ;

var GetOriginalERA5 = function( Season , Domain , TargetUTCHour ) {

  var SeasonDict = ee.Dictionary( Season ) ;

  return PrepareERA5Mean( Domain , SeasonDict.get( 'start' ) , SeasonDict.get( 'end' ) , TargetUTCHour ).clip( Domain ) ;

} ;

var RunVisualization = function() {

  CityConfigs.forEach(function(City) {

    City.Original = GetOriginalERA5( City.Seasons[0] , City.FullDomain , City.UTCHour ) ;

    City.Images = City.Seasons.map(function(Season) {

      return ee.Dictionary( ERA5Downscaling( Season , City.TrainingDomain , City.HoldoutDomain ) ).get('image') ;

    }) ;

    City.FinalCollection = ee.ImageCollection.fromImages( City.Images ) ;

    City.VisLabel = City.Seasons[0].label ;

    City.VisImage = City.FinalCollection.filter( ee.Filter.eq( 'Season' , City.VisLabel ) ).first().clip( City.HoldoutDomain ) ;

    City.BCCube = ee.Image( Config.AssetRoot + '/BC-ERA5/' + City.Name + '/' + City.Name + '-' + City.VisLabel ) ;

    City.BC = GetSeasonalBCMean( City.BCCube ) ;

    var Tag = City.Label + ' | ' + City.VisLabel ;

    if ( VisToggles.Original.T2M ) { Map.addLayer( City.Original.select('T2M').subtract(273.15) , T2MVisParams , Tag + ' | OG T2M' ) ; }
    
    if ( VisToggles.Original.WS  ) { Map.addLayer( City.Original.select('WS')                   , WSVisParams  , Tag + ' | OG WS'  ) ; }
    
    if ( VisToggles.Original.SR  ) { Map.addLayer( City.Original.select('SR')                   , SRVisParams  , Tag + ' | OG SR'  ) ; }
    
    if ( VisToggles.Original.RH  ) { Map.addLayer( City.Original.select('RH')                   , RHVisParams  , Tag + ' | OG RH'  ) ; }
    
    if ( VisToggles.Original.SM  ) { Map.addLayer( City.Original.select('SM')                   , SMVisParams  , Tag + ' | OG SM'  ) ; }
    
    if ( VisToggles.BC.T2M       ) { Map.addLayer( City.BC.select('T2M')                        , T2MVisParams , Tag + ' | BC T2M' ) ; }
    
    if ( VisToggles.BC.WS        ) { Map.addLayer( City.BC.select('WS')                         , WSVisParams  , Tag + ' | BC WS'  ) ; }
     
    if ( VisToggles.BC.D2M       ) { Map.addLayer( City.BC.select('D2M')                        , RHVisParams  , Tag + ' | BC D2M' ) ; }
    
    if ( VisToggles.DS.T2M       ) { Map.addLayer( City.VisImage.select('T2M')                  , T2MVisParams , Tag + ' | DS T2M' ) ; }
    
    if ( VisToggles.DS.WS        ) { Map.addLayer( City.VisImage.select('WS')                   , WSVisParams  , Tag + ' | DS WS'  ) ; }
    
    if ( VisToggles.DS.SR        ) { Map.addLayer( City.VisImage.select('SR')                   , SRVisParams  , Tag + ' | DS SR'  ) ; }
    
    if ( VisToggles.DS.RH        ) { Map.addLayer( City.VisImage.select('RH')                   , RHVisParams  , Tag + ' | DS RH'  ) ; }
    
    if ( VisToggles.DS.SM        ) { Map.addLayer( City.VisImage.select('SM')                   , SMVisParams  , Tag + ' | DS SM'  ) ; }

  }) ;

} ;

// —————————————————————————————
// [14] Multi-Band Raster Export
// —————————————————————————————

var ExportFinalRasterStacks = function( CityName , SeasonList , HoldoutDomain ) {

  var HoldoutGeom = HoldoutDomain.geometry()                                                                  ;

  var FullDomain  = ee.FeatureCollection( Config.AssetRoot + '/Spatial-Domains/Complete-Domain/' + CityName ) ;

  var FullGeom    = FullDomain.geometry()                                                                     ;

  SeasonList.forEach( function( Season ) {

    var SeasonLabel = Season.label     ;

    var StartDate   = Season.start     ;

    var EndDate     = Season.end       ;

    var TargetUTC   = Season.TargetUTC ;

    var TargetCRS   = Season.crs       ;

    // [14.1] Downscaled Stack, Holdout Domain, 10 m

    var DSAssetPath = Config.AssetRoot + '/DS-ERA5/' + CityName + '/' + CityName + '-' + SeasonLabel ;

    var DSImage = ee.Image( DSAssetPath )

        .clip( HoldoutDomain )

        .select( [ 'T2M' , 'WS' , 'SM' , 'SR' , 'RH' ] )

        .toFloat() ;

    Export.image.toDrive({

      description    : CityName + '-' + SeasonLabel + '-DS-Holdout' ,

      fileNamePrefix : CityName + '-' + SeasonLabel + '-DS-Holdout' ,

      image          : DSImage                                      ,

      folder         : 'UC4D/ERA5/02 Results/Spatial Maps'          ,

      region         : HoldoutGeom                                  ,

      scale          : TargetResolution                             ,

      crs            : TargetCRS                                    ,

      maxPixels      : MaxPixels                                    ,

      fileFormat     : 'GeoTIFF'                                    ,

      formatOptions  : { noData : NoData }

    }) ;

    // [14.2] Raw + Bias-Corrected Stack [Full Domain, ERA5-Land Grid]

    var RawMean     = PrepareERA5Mean( FullDomain , ee.Date( StartDate ) , ee.Date( EndDate ) , TargetUTC ) ;

    var RawT2M      = RawMean.select( 'T2M' ).subtract( 273.15 ).rename( 'RawT2M' )                         ;

    var RawD2M      = RawMean.select( 'D2M' ).subtract( 273.15 ).rename( 'RawD2M' )                         ;

    var RawWS       = RawMean.select( 'WS' ).rename( 'RawWS' )                                              ;

    var BCAssetPath = Config.AssetRoot + '/BC-ERA5/' + CityName + '/' + CityName + '-' + SeasonLabel        ;

    var BCMean      = GetSeasonalBCMean( BCAssetPath )                                                      ;

    var BCT2M       = BCMean.select( 'T2M' ).rename( 'BCT2M' )                                              ;

    var BCWS        = BCMean.select( 'WS'  ).rename( 'BCWS'  )                                              ;

    var BCD2M       = BCMean.select( 'D2M' ).rename( 'BCD2M' )                                              ;

    var RawBCStack = RawT2M.addBands( RawWS ).addBands( RawD2M ).addBands( BCT2M ).addBands( BCWS ).addBands( BCD2M )

        .toFloat()

        .setDefaultProjection( ee.Projection( 'EPSG:4326' , [ 0.1 , 0 , -180.05 , 0 , -0.1 , 90.05 ] ) )

        .clip( FullDomain ) ;

    Export.image.toDrive({

      description    : CityName + '-' + SeasonLabel + '-Raw-BC-Full' ,

      fileNamePrefix : CityName + '-' + SeasonLabel + '-Raw-BC-Full' ,

      image          : RawBCStack                                    ,

      folder         : 'UC4D/ERA5/02 Results/Spatial Maps'           ,

      region         : FullGeom                                      ,

      crs            : 'EPSG:4326'                                   ,

      crsTransform   : [ 0.1 , 0 , -180.05 , 0 , -0.1 , 90.05 ]      ,

      maxPixels      : MaxPixels                                     ,

      fileFormat     : 'GeoTIFF'                                     ,

      formatOptions  : { noData : NoData }

    }) ;

  }) ;

} ;

// [14.4] Stack Downloader

// CityConfigs.forEach(function(City) { 

//   ExportFinalRasterStacks( City.Name , City.Seasons , City.TrainingDomain , City.HoldoutDomain ) ;

// }) ;

// ——————————————
// [15] Execution
// ——————————————

var RunExecution = function() {

  CityConfigs.forEach( function( City ) {

    // [15.1] Run Bias Correction & LOSOCV Validation

    if ( Switch.BC )         City.Seasons.forEach( function(s) { ERA5Config.ExportBiasCorrectedCube( City.Name , s , GHCNStations ) ; } ) ;

    // [15.2] Generate Training Samples

    if ( Switch.Samples )    GenerateSamples( City.TrainingDomain , City.Name , true ) ;

    // [15.3] Train & Export RF Models

    if ( Switch.RF )         City.Seasons.forEach( function(s) { TrainAndExportERARFModels( s , City.TrainingDomain , City.Name ) ; } ) ;
  
    // [15.4] Run Downscaling
    
    if ( Switch.Downscale )  RunDownscaling( City.TrainingDomain , City.HoldoutDomain , City.Seasons , City.Name ) ;

    // [15.5] Run Daily Validation

    if ( Switch.Validation ) City.Seasons.forEach( function(s) { ExportDailyValidation( GHCNStations , City.FullDomain , [ s ] , City.Name , City.HoldoutDomain ) ; } ) ;

  } ) ;

} ;

Overpass.Resolve( function( T ) {

  CityConfigs.forEach( function( City ) {

    City.UTCHour = T[ City.Name ].UTCHour ;

    City.Seasons.forEach( function( S ) { S.TargetUTC = City.UTCHour ; } ) ;

  } ) ;

  var PendingCRS = CityConfigs.length ;
  
  CityConfigs.forEach( function( City ) {
    
    Config.CityCRS[ City.Name ].evaluate( function( ResolvedCRS ) {
      
      City.Seasons.forEach( function( S ) { S.crs = ResolvedCRS ; } ) ;
      
      PendingCRS -= 1 ;
      
      if ( PendingCRS === 0 ) {

        RunVisualization() ;

        RunExecution()   ;

      }
      
    } ) ;
    
  } ) ;

} ) ; 
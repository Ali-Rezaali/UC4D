// ———————————————————————————————
// [1] Correction Library Settings
// ———————————————————————————————

var Config           = require('users/alirezaali/UC4D:01 Configurations') ; 

var MaxPixels        = Config.MaxPixels                                   ;

var ERA5LandRes      = Config.ERA5LandRes                                 ;

var ResamplingMethod = Config.ResamplingMethod                            ;

// —————————————————————————
// [2] Station Deduplication
// —————————————————————————

var DeduplicateStations = function( Stations , ObsTable , SeasonLabel , StartDate , EndDate , TargetUTC ) {

  // [2.1] Native ERA5-Land Projection Selection

  var ERA5Proj = ee.ImageCollection( 'ECMWF/ERA5_LAND/HOURLY' )

      .filterBounds( Stations.geometry() )

      .first()

      .select( 'temperature_2m' )

      .projection() ;

  // [2.2] Sample Native Integer Grid Coordinates Directly Onto Stations

  var StationsWithPixel = ee.Image.pixelCoordinates( ERA5Proj ).sampleRegions({

    collection : Stations ,

    projection : ERA5Proj ,

    geometries : true

  }) ;

  // [2.3] Count Observations For Target Season And Local Hour

  var ObsCountDict = ObsTable

      .filter( ee.Filter.eq( 'Season' , SeasonLabel ) )
      
      .filter( ee.Filter.eq( 'Hour_UTC' , TargetUTC ) ) 

      .filter( ee.Filter.notNull( [ 'T2M' , 'WS10M' , 'D2M' ] ) )

      .aggregate_histogram( 'GHCN_ID' ) ;

  // [2.4] Attach Seasonal Observation Count & Build Clean Integer Grid Key

  var StationsWithCount = StationsWithPixel.map( function( Feature ) {

    var ID       = ee.String( Feature.get( 'GHCN_ID' ) )                                             ;

    var Count    = ee.Dictionary( ObsCountDict ).get( ID , 0 )                                       ;

    var PixelKey = ee.String( Feature.get( 'x' ) ).cat( '_' ).cat( ee.String( Feature.get( 'y' ) ) ) ;

    return Feature.set({

      'GHCN_ID'  : ID                 ,

      'ObsCount' : ee.Number( Count ) ,

      'GridKey'  : PixelKey

    }) ;

  }) ;

  // [2.5] Filter Active Stations, Apply Secondary Tie-Breaker (GHCN_ID), and Keep Top Station Per Pixel

  return StationsWithCount

      .filter( ee.Filter.gt( 'ObsCount' , 0 ) )

      .sort( 'GHCN_ID' )

      .sort( 'ObsCount' , false )

      .distinct( 'GridKey' ) ;

} ;

exports.DeduplicateStations = DeduplicateStations ;

// ———————————————————————————————
// [3] Bias Correction Cube Export
// ———————————————————————————————

function ExportBiasCorrectedCube( CityName , SeasonObj , StationCollection ) {

  // [3.1] Initialization & Spatial Domain Definition

  var CompleteDomain   = ee.FeatureCollection( Config.AssetRoot + '/Spatial-Domains/Complete-Domain/' + CityName ).geometry() ;

  var StationsInDomain = StationCollection.filterBounds( CompleteDomain )                                                     ;

  var SeasonDict       = ee.Dictionary( SeasonObj )                                                                           ;

  var SeasonLabel      = SeasonObj.label                                                                                      ;

  var StartDate        = ee.Date( SeasonDict.get( 'start' ) )                                                                 ;

  var EndDate          = ee.Date( SeasonDict.get( 'end' ) )                                                                   ;

  var TargetUTC        = SeasonDict.getNumber( 'TargetUTC' )                                                                  ;

  // [3.2] In-Situ Observation Ingestion

  var ObsPath          = Config.AssetRoot + '/GHCNh/' + CityName ;

  var AllObs           = ee.FeatureCollection( ObsPath )

      .filter( ee.Filter.eq( 'Season' , SeasonLabel ) )
      
      .filter( ee.Filter.eq( 'Hour_UTC' , TargetUTC ) )

      .filter( ee.Filter.notNull( [ 'T2M' , 'WS10M' , 'D2M' ] ) )

      .map( function( Obs ) {

        return Obs.set( 'DateStr' , ee.String( Obs.get( 'Date' ) ) )

                  .set( 'GHCN_ID' , Obs.get( 'GHCNID' ) )

                  .set( 'ObsT2M'  , Obs.get( 'T2M' ) )

                  .set( 'ObsWS'   , Obs.get( 'WS10M' ) )

                  .set( 'ObsD2M'  , Obs.get( 'D2M' ) ) ;

         }) ;

  var ObsIDs            = AllObs.distinct( [ 'GHCN_ID' ] ).aggregate_array( 'GHCN_ID' ) ;

  // [3.3] Reanalysis Data Harmonization

  var ERA5Land          = ee.ImageCollection( 'ECMWF/ERA5_LAND/HOURLY' )

                          .filterBounds( CompleteDomain )
                    
                          .filterDate( StartDate , EndDate.advance( 1 , 'day' ) )
                    
                          .filter( ee.Filter.calendarRange( TargetUTC , TargetUTC , 'hour' ) ) ;

  var ERA5              = ee.ImageCollection( 'ECMWF/ERA5/HOURLY' )

                          .filterBounds( CompleteDomain )
                    
                          .filterDate( StartDate , EndDate.advance( 1 , 'day' ) )
                    
                          .filter( ee.Filter.calendarRange( TargetUTC , TargetUTC , 'hour' ) ) ;

  var ERA5Projection    = ERA5Land.first().select( 'temperature_2m' ).projection() ;

  var DedupedBCStations = DeduplicateStations( StationsInDomain.filter( ee.Filter.inList( 'GHCN_ID' , ObsIDs ) ) , AllObs , SeasonLabel , StartDate , EndDate , TargetUTC ) ;

  var StationsWithObs   = DedupedBCStations ;

  // [3.4] Feature Stack Definition

  var T2MBCFeatures   = [ 

    'temperature_2m'                        ,

    'skin_temperature'                      ,

    'temperature_850hPa'                    ,

    'surface_solar_radiation_downwards'     ,

    'boundary_layer_height'                 ,

    'total_cloud_cover'                     ,

    'dewpoint_temperature_2m'               ,

    'volumetric_soil_water_layer_1'         ,

    'u_component_of_wind_10m'               ,

    'v_component_of_wind_10m'

  ] ;

  var WSBCFeatures    = [ 

    'u_component_of_wind_10m'               ,

    'v_component_of_wind_10m'               ,

    'u_component_of_wind_100m'              ,

    'v_component_of_wind_100m'              ,

    'u_component_of_wind_850hPa'            ,

    'v_component_of_wind_850hPa'            ,

    'boundary_layer_height'                 ,

    'surface_solar_radiation_downwards'     ,

    'instantaneous_10m_wind_gust'

  ] ;

  var D2MBCFeatures   = [ 

    'dewpoint_temperature_2m'               ,

    'temperature_2m'                        ,

    'volumetric_soil_water_layer_1'         ,

    'leaf_area_index_low_vegetation'        ,

    'total_column_water_vapour'             ,

    'specific_humidity_850hPa'              ,

    'u_component_of_wind_10m'               ,

    'v_component_of_wind_10m'               ,

    'boundary_layer_height'

  ] ;

  var DynamicStack   = ee.List( T2MBCFeatures ).cat( WSBCFeatures ).cat( D2MBCFeatures ).distinct() ;

  // [3.5] Generate Daily Image Cubes & Extract Point-Based Covariates

  function DailyImageGeneration( TargetDate ) {

    TargetDate       = ee.Date( TargetDate )                             ;

    var DayEnd       = TargetDate.advance( 1 , 'day' )                   ;

    var ERA5LandMean = ERA5Land.filterDate( TargetDate , DayEnd ).mean() ;

    var ERA5Mean     = ERA5.filterDate( TargetDate , DayEnd ).mean()     ;

    var T2MC         = ERA5LandMean.select( 'temperature_2m' )

                                      .unmask( ERA5Mean.select( 'temperature_2m' ) )
                              
                                      .subtract( 273.15 )
                              
                                      .rename( 'ERA5T2M' ) ;

    var D2MC         = ERA5LandMean.select( 'dewpoint_temperature_2m' )

                                      .unmask( ERA5Mean.select( 'dewpoint_temperature_2m' ) )
                              
                                      .subtract( 273.15 )
                              
                                      .rename( 'D2MC' ) ;

    var DynamicBands = ERA5Mean.select( DynamicStack )  ;

    return T2MC.addBands( D2MC ).addBands( DynamicBands ).setDefaultProjection( ERA5Projection ) ;

  }

  function SampleStations( DailyImage , DateStr ) {

    return DailyImage.sampleRegions({

      collection : StationsWithObs ,

      scale      : 10              ,

      geometries : false

    }).map( function( Feature ) {

      var U  = Feature.getNumber( 'u_component_of_wind_10m' ) ;

      var V  = Feature.getNumber( 'v_component_of_wind_10m' ) ;

      var WS = U.pow( 2 ).add( V.pow( 2 ) ).sqrt()            ;

      return Feature.set( 'DateStr' , DateStr )

                    .set( 'RawWS'   , WS )

                    .set( 'RawD2M'  , Feature.getNumber( 'D2MC' ) ) ;

    }) ;

  }

  var DayCount          = EndDate.difference( StartDate , 'day' ).add( 1 ) ;

  var DayOffsets        = ee.List.sequence( 0 , DayCount.subtract( 1 ) )   ;

  var AllSampled        = ee.FeatureCollection(

    DayOffsets.map( function( Offset ) {

      var CurrentDate = StartDate.advance( Offset , 'day' ) ;

      var DateStr     = CurrentDate.format( 'YYYY-MM-dd' )  ;

      var DailyImg    = DailyImageGeneration( CurrentDate ) ;

      return SampleStations( DailyImg , DateStr )           ;

    })

  ).flatten() ;

  var JoinFilter        = ee.Filter.and(

    ee.Filter.equals({ leftField : 'DateStr' , rightField : 'DateStr' }) ,

    ee.Filter.equals({ leftField : 'GHCN_ID' , rightField : 'GHCN_ID' })

  ) ;

  var Joined            = ee.Join.saveFirst({ matchKey : 'Match' }).apply( AllSampled , AllObs , JoinFilter ) ;

  var AllFeatures       = Joined

      .filter( ee.Filter.notNull( [ 'Match' ] ) )

      .map( function( Feature ) {

        var MatchObj = ee.Feature( Feature.get( 'Match' ) )                                      ;

        Feature      = Feature.copyProperties( MatchObj , [ 'ObsT2M' , 'ObsWS' , 'ObsD2M' ] )    ;

        var ResT2M   = ee.Number( Feature.get( 'ObsT2M' ) ).subtract( Feature.get( 'ERA5T2M' ) ) ;

        var ResWS    = ee.Number( Feature.get( 'ObsWS' ) ).subtract( Feature.get( 'RawWS' ) )    ;

        var ResD2M   = ee.Number( Feature.get( 'ObsD2M' ) ).subtract( Feature.get( 'RawD2M' ) )  ;

        return Feature.set( 'ResidualT2M' , ResT2M )

                      .set( 'ResidualWS'  , ResWS )

                      .set( 'ResidualD2M' , ResD2M ) ;

      }) ;

  // [3.6] Residual Target Generation And RF Model Training

  function TrainBCModel( Features , Target , Inputs ) {

    var FeatureCount      = Inputs.length                 ;

    var VariablesPerSplit = Math.ceil( FeatureCount / 3 ) ;

    return ee.Classifier.smileRandomForest({

      numberOfTrees     : Config.RF.numberOfTrees     ,

      minLeafPopulation : Config.RF.minLeafPopulation ,

      bagFraction       : Config.RF.bagFraction       ,

      maxNodes          : null                        ,

      variablesPerSplit : VariablesPerSplit           ,

      seed              : Config.RandomSeed

    })

    .setOutputMode( 'REGRESSION' )

    .train({

      features        : Features ,

      classProperty   : Target   ,

      inputProperties : Inputs

    }) ;

  }

  // [3.7] Full-Dataset Production Models (For Spatial Raster Generation)

  var ProductionModelT2M = TrainBCModel( AllFeatures , 'ResidualT2M' , T2MBCFeatures ) ;

  var ProductionModelWS  = TrainBCModel( AllFeatures , 'ResidualWS'  , WSBCFeatures  ) ;

  var ProductionModelD2M = TrainBCModel( AllFeatures , 'ResidualD2M' , D2MBCFeatures ) ;

  // [3.8] Leave-One-Station-Out Cross-Validation (LOSOCV)

  var StationIDs    = AllFeatures.distinct( [ 'GHCN_ID' ] ).aggregate_array( 'GHCN_ID' ) ;

  var LOSOCVResults = ee.FeatureCollection(

    StationIDs.map( function( TestID ) {

      TestID       = ee.String( TestID ) ;

      var TrainFC  = AllFeatures.filter( ee.Filter.neq( 'GHCN_ID' , TestID ) ) ;

      var TestFC   = AllFeatures.filter( ee.Filter.eq( 'GHCN_ID' , TestID ) )  ;

      var T2MModel = TrainBCModel( TrainFC , 'ResidualT2M' , T2MBCFeatures )   ;

      var WSModel  = TrainBCModel( TrainFC , 'ResidualWS'  , WSBCFeatures  )   ;

      var D2MModel = TrainBCModel( TrainFC , 'ResidualD2M' , D2MBCFeatures )   ;

      return TestFC

          .classify( T2MModel , 'PredResT2M' )

          .classify( WSModel  , 'PredResWS'  )

          .classify( D2MModel , 'PredResD2M' )

          .map( function( Feature ) {

            var CorrectedT2M = ee.Number( Feature.get( 'ERA5T2M' ) ).add( Feature.get( 'PredResT2M' ) )                    ;

            var CorrectedWS  = ee.Number( Feature.get( 'RawWS' ) ).add( Feature.get( 'PredResWS' ) ).max( 0 )              ;

            var CorrectedD2M = ee.Number( Feature.get( 'RawD2M' ) ).add( Feature.get( 'PredResD2M' ) ).min( CorrectedT2M ) ;

            return Feature.setGeometry( null )

                          .set( 'Date'   , Feature.get( 'DateStr' ) )

                          .set( 'RawT2M' , Feature.get( 'ERA5T2M' ) )

                          .set( 'ObsT2M' , Feature.get( 'ObsT2M' )  )

                          .set( 'BCT2M'  , CorrectedT2M             )

                          .set( 'ObsWS'  , Feature.get( 'ObsWS' )   )

                          .set( 'BCWS'   , CorrectedWS              )

                          .set( 'ObsD2M' , Feature.get( 'ObsD2M' )  )

                          .set( 'BCD2M'  , CorrectedD2M             ) ;

          }) ;

    })

  ).flatten() ;

  Export.table.toDrive({

    collection  : LOSOCVResults                                       ,

    description : CityName + '-' + SeasonLabel + '-LOSOCV'            ,

    folder      : 'UC4D/ERA5/02 Results/Bias Correction/' + CityName  ,

    fileFormat  : 'CSV'                                               ,

    selectors   : [ 'GHCN_ID' , 'Date' , 'RawT2M' , 'RawD2M' , 'RawWS' , 'ObsT2M' , 'ObsD2M' , 'ObsWS' , 'BCT2M' , 'BCD2M' , 'BCWS' ]

  }) ;

  var DailyBCList   = DayOffsets.map( function( Offset ) {

    var CurrentDate = StartDate.advance( Offset , 'day' )                                                      ;

    var DateStr     = CurrentDate.format( 'YYYYMMdd' )                                                         ;

    var DailyImg    = DailyImageGeneration( CurrentDate )                                                      ;

    var U           = DailyImg.select( 'u_component_of_wind_10m' )                                             ;

    var V           = DailyImg.select( 'v_component_of_wind_10m' )                                             ;

    var RawWS       = U.pow( 2 ).add( V.pow( 2 ) ).sqrt().rename( 'RawWS' )                                    ;

    DailyImg        = DailyImg.addBands( RawWS )                                                               ;

    var PredT2M     = DailyImg.select( T2MBCFeatures ).classify( ProductionModelT2M ).rename( 'PredResT2M' )   ;

    var PredWS      = DailyImg.select( WSBCFeatures ).classify( ProductionModelWS ).rename( 'PredResWS' )      ;

    var PredD2M     = DailyImg.select( D2MBCFeatures ).classify( ProductionModelD2M ).rename( 'PredResD2M' )   ;

    var BCT2M       = DailyImg.select( 'ERA5T2M' ).add( PredT2M ).rename( 'T2M' )                              ;

    var WSBC        = RawWS.add( PredWS ).rename( 'WS' ).max( 0 )                                              ;

    var D2MBC       = DailyImg.select( 'D2MC' ).add( PredD2M ).rename( 'D2M' ).min( BCT2M )                    ;

    return BCT2M.addBands( WSBC ).addBands( D2MBC )

                .set( 'system:time_start' , CurrentDate.millis() )

                .set( 'system:index' , ee.String( 'd' ).cat( DateStr ) ) ;

  }) ;

  var SeasonCollection = ee.ImageCollection( DailyBCList ) ;

  var MultiBandBC = SeasonCollection.toBands().clip( CompleteDomain ).set({

    'season' : SeasonLabel                      ,

    'start'  : StartDate.format( 'YYYY-MM-dd' ) ,

    'end'    : EndDate.format( 'YYYY-MM-dd' )

  }) ;

  var AssetID = Config.AssetRoot + '/BC-ERA5/' + CityName + '/' + CityName + '-' + SeasonLabel ;

  Export.image.toAsset({

    description : CityName + '-BC-' + SeasonLabel ,

    image       : MultiBandBC                     ,

    assetId     : AssetID                         ,

    scale       : ERA5LandRes                     ,

    region      : CompleteDomain.bounds()         ,

    maxPixels   : MaxPixels                       ,

    overwrite   : true

  }) ;
 
}

exports.ExportBiasCorrectedCube = ExportBiasCorrectedCube ;

// ————————————————————————————————
// [4] Two Pass Residual Correction 
// ————————————————————————————————

function ApplyTPRC( FinePrediction , CoarseTarget , CoarseProjection , TargetCRS , TargetScale ) {

  var CleanCoarseProj  = CoarseProjection                              ;

  var CleanFineProj    = ee.Projection(TargetCRS).atScale(TargetScale) ;

  var CoarseScale      = CleanCoarseProj.nominalScale()                ;

  // [4.1] Pass 1: Coarse Aggregation
  
  var CoarsePrediction = FinePrediction

    .reduceResolution({ reducer: ee.Reducer.mean() , maxPixels : 512 , bestEffort : true })

    .reproject(CleanCoarseProj )

    .selfMask() ;

  // [4.2] Residual

  var Residual = CoarseTarget.subtract(CoarsePrediction) ;

  // [4.3] Gaussian Smoothing (FWHM)

  var FWHMToSigma   = 0.4246609                          ;
  
  var GaussianSigma = CoarseScale.multiply(FWHMToSigma)  ;
  
  var SmoothKernel  = ee.Kernel.gaussian({ radius : GaussianSigma.multiply(3).ceil() ,
    
    sigma : GaussianSigma , units : 'meters' , normalize: true }) ;

  var SmoothedResidual = Residual
    
    .unmask(0) 
    
    .convolve(SmoothKernel) ;

  // [4.4] Resample To Fine Grid, Additive Pass 1
 
  var HighResResidual  = SmoothedResidual.resample(ResamplingMethod).reproject( CleanFineProj ) ;

  var UncalibratedFine = FinePrediction.add(HighResResidual) ;

  // [4.5] Pass 2: Reaggregate Uncalibrated Field

  var ReAggregated = UncalibratedFine
  
    .setDefaultProjection(CleanFineProj)
  
    .reduceResolution({ reducer: ee.Reducer.mean() , maxPixels : 512 , bestEffort : true })
  
    .reproject( CleanCoarseProj ) ;

  // [4.6] Additive Closure Delta
  
  var ClosureDelta   = CoarseTarget.subtract(ReAggregated).unmask(0) ;
  
  var HighResDelta   = ClosureDelta.resample(ResamplingMethod).reproject(  CleanFineProj ) ;

  // [4.7] Final Conserved Field
  
  var ConservedFine = UncalibratedFine.add(HighResDelta) ;

  return ConservedFine.updateMask(FinePrediction.mask()) ;

}

exports.ApplyTPRC = ApplyTPRC ; 

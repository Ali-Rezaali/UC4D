// ———————————————————————
// [1] Imports & Constants
// ———————————————————————

var Config     = require('users/alirezaali/UC4D:01 Configurations')               ;

var FeatureLib = require('users/alirezaali/UC4D:04 Multi-Source Feature Library') ;

// [1.1] Scales & Distances (m)

var ScaleNativeFINP  = 10     ;

var ScaleFINP        = 50     ;

var ScaleCORP        = 150    ;

var ScaleNativeCORP  = 926.6  ;

var ScaleWorldPop    = 100    ;

var ScaleNTL         = 463.83 ;

var PixelAreaFINP    = 100    ;

var SARSampleBuffer  = 100    ;

var WaterErodeBuffer = -30    ;

// [1.2] Numerical Guards & Compute Limits

var ReduceResMaxPixels = 1024  ;

var SARTileScale       = 4     ;

var DivideFloor        = 1e-9  ;

var VarianceFloor      = 1e-12 ;

var NTLRatioFloor      = 1e-3  ;

var MinENLPixels       = 10    ;

var VVScaleFactor      = 100   ;

// [1.3] TIRP Sampling

var TIRPPointsPerPolygon = 25                                                                                                                                                          ;

var TIRPPolygonLimit     = 50                                                                                                                                                          ;

var TIRPSeed             = 42                                                                                                                                                          ;

var RandomPointMaxError  = 1                                                                                                                                                           ;

var WaterClassID         = 'LCZG'                                                                                                                                                      ;

var LCZClassProperty     = 'LCZID'                                                                                                                                                     ;

var LCZIDs               = [ 'LCZ1' , 'LCZ2' , 'LCZ3' , 'LCZ4' , 'LCZ5' , 'LCZ6' , 'LCZ7' , 'LCZ8' , 'LCZ9' , 'LCZ10' , 'LCZA' , 'LCZB' , 'LCZC' , 'LCZD' , 'LCZE' , 'LCZF' , 'LCZG' ] ;

// [1.4] NTL Plausibility Thresholds

var NTLHighPct  = 90                     ;

var BCRLowPct   = 10                     ;

var NDVIHighPct = 90                     ;

var NTLHighCol  = 'NTL-P'  + NTLHighPct  ;

var BCRLowCol   = 'BCR-P'  + BCRLowPct   ;

var NDVIHighCol = 'NDVI-P' + NDVIHighPct ;

// [1.5] Band Roles, External Sources & Folder Names

var ObsBand             = 'B2'                                ; // S2 Band Used To Count Valid Observations

var ReferenceBand       = 'NDVI'                              ; // Band Used For Validity / Total Pixel Counts

var SpeckleBand         = 'VV'                                ; // SAR Band Used For ENL

var NTLSourceCollection = 'NASA/VIIRS/002/VNP46A2'            ;

var NTLSourceBand       = 'Gap_Filled_DNB_BRDF_Corrected_NTL' ;

var DynamicFolder       = 'Dynamic'                           ;

var StaticFolder        = 'Static'                            ;

var PDFolder            = 'Spatial-Distribution'              ;

var ExportFolder        = 'UC4D/UC4D-Validation'              ;

// [1.6] Band Groups & Plausibility Rules

var TopoBands         = [ 'Elevation' , 'Slope' , 'Northness' , 'Eastness' ]                                       ;

var TopoPrefix        = { 'Elevation' : 'Elev' , 'Slope' : 'Slope' , 'Northness' : 'North' , 'Eastness' : 'East' } ;

var PlausibilityRules = [

  { Name : 'NDVI-high-Albedo-high' , Expr : '(NDVI > 0.5) && (Albedo > 0.35) ? 1 : 0' } ,

  { Name : 'NDVI-high-BSI-high'    , Expr : '(NDVI > 0.5) && (BSI > 0.2) ? 1 : 0'     } ,

  { Name : 'NDWI-high-NDVI-high'   , Expr : '(NDWI > 0.2) && (NDVI > 0.5) ? 1 : 0'    } ,

  { Name : 'MNDWI-high-BSI-high'   , Expr : '(MNDWI > 0.2) && (BSI > 0.2) ? 1 : 0'    }

] ;

// [1.7] Reported Percentiles (Drive Both The Reducers & The CSV Column Names)

var RangePercentiles     = [ 5 , 25 , 50 , 75 , 95 ] ;

var PlausPercentiles     = [ 5 , 50 , 95 ]           ;

var TopoPercentiles      = [ 1 , 5 , 50 , 95 , 99 ]  ;

var TopoDiffPercentiles  = [ 5 , 95 ]                ;

var TileRatioPercentiles = [ 5 , 50 , 95 ]           ;

// [1.8] Cloud-Screening Threshold Sensitivity

var ClearThreshold = FeatureLib.ClearThreshold                                    ;

var ThresholdStep  = 0.10                                                         ;

var ClearRelaxed   = Math.round( ( ClearThreshold - ThresholdStep ) * 100 ) / 100 ;

var ClearStrict    = Math.round( ( ClearThreshold + ThresholdStep ) * 100 ) / 100 ;

// ——————————
// [2] Config
// ——————————

var Cities       = Config.PrimaryTargets             ;

var AssetBase    = Config.AssetRoot + '/STC'         ;

var FINPBase     = AssetBase + '/FINP'               ;

var CORPBase     = AssetBase + '/CORP'               ;

var WorldPopBase = Config.WorldPopFolder             ;

var MaxPixels    = Config.MaxPixels                  ;

var TIRPBase     = Config.AssetRoot + '/Samples/LCZ' ;

var Bundles      = {}                                ;

Cities.forEach( function( CityName ) {

  Bundles[ CityName ] = {

    Seasons   : Config[ CityName + 'Seasons' ]       ,

    Holdout   : Config[ CityName + 'HoldoutDomain' ] ,

    SUHI      : Config[ CityName + 'SUHIDomain'    ] ,

    Countries : Config.CountryNamesByCity.get( CityName ).getInfo()

  } ;

} ) ;

var SARBands          = [ 'VV' , 'VH' , 'Diff' ]                                                                 ;

var OptBands          = [ 'B1' , 'B2' , 'B3' , 'B4' , 'B5' , 'B6' , 'B7' , 'B8' , 'B8A' , 'B9' , 'B11' , 'B12' ] ;

var IdxBands          = [ 'NDVI' , 'MSAVI2' , 'NDWI' , 'NDMI' , 'NDRE' , 'BSI' , 'MNDWI' , 'EVI2' , 'BLFEI' ]    ;

var PhysBands         = [ 'Albedo' , 'FVC' , 'Emissivity' ]                                                      ;

var AllBands          = SARBands.concat( OptBands , IdxBands , PhysBands )                                       ;

var VIIRSCRSTransform = Config.VIIRSCRSTransform                                                                 ;

var VIIRSCRS          = Config.VIIRSCRS                                                                          ;

var NTLProjection     = Config.NTLProjection                                                                     ;

// ——————————————————
// [3] Shared Helpers
// ——————————————————

// [3.1] Imports

var UnscaleCube            = Config.UnscaleCube                ;

var GetSentinel2           = FeatureLib.GetSentinel2           ;

var GetSentinel2Candidates = FeatureLib.GetSentinel2Candidates ;

var GetSentinel1Raw        = FeatureLib.GetSentinel1Raw        ;

var ApplyClearMask         = FeatureLib.ApplyClearMask         ;

var QABand                 = FeatureLib.QABand                 ;

// [3.2] Asset Loaders

var LoadFINP       = function(City, SeasonLabel) { return ee.Image( FINPBase + '/' + City + '/' + DynamicFolder + '/' + City + '-' + SeasonLabel ) ; } ;

var LoadCORP       = function(City, SeasonLabel) { return ee.Image( CORPBase + '/' + City + '/' + DynamicFolder + '/' + City + '-' + SeasonLabel ) ; } ;

var LoadFINPStatic = function(City) { return ee.Image( FINPBase + '/' + City + '/' + StaticFolder + '/' + City ) ; }                                   ;

var LoadCORPStatic = function(City) { return ee.Image( CORPBase + '/' + City + '/' + StaticFolder + '/' + City ) ; }                                   ;

var LoadTIRPs      = function(City) {

  return ee.FeatureCollection( TIRPBase + '/' + City ).filterBounds( Bundles[City].SUHI ) ;

} ;

// [3.3] Iteration

var UniqueYears = function(SeasonList) {

  var Seen = {};

  SeasonList.forEach(function(S) { Seen[S.LCZYear] = true ; }) ;

  return Object.keys(Seen).map(Number).sort(function(A, B) { return A - B ; }) ;

} ;

var ForEachCitySeason = function(Callback) {

  Cities.forEach(function(City) {

    Bundles[City].Seasons.forEach(function(Season) {

      Callback( City , Season.label , Season ) ;

    }) ;

  }) ;

} ;

// CORP is Exported Unscaled, FINP is Exported Scaled.

var TierImages = function(City, Label) {

  return [ 

    { Source : 'CORP' , Image : LoadCORP( City , Label ) , Scale : ScaleCORP } ,

    { Source : 'FINP' , Image : UnscaleCube( LoadFINP( City , Label ) ) , Scale : ScaleFINP }

  ] ;

} ;

// [3.4] Statistics

var ReduceStats = function(Image, Reducer, Geom, Scale) {

  return Image.reduceRegion({

    reducer    : Reducer   ,

    geometry   : Geom      ,

    scale      : Scale     ,

    maxPixels  : MaxPixels ,

    bestEffort : false

  }) ;

} ;

var FractionOf = function(Mask, Name, Geom, Scale) {

  return ReduceStats( Mask.rename(Name) , ee.Reducer.mean() , Geom , Scale ).get(Name) ;

} ;

var PercentileOf = function(Image, Band, Pct, Geom, Scale) {

  return ee.Number( ReduceStats( Image , ee.Reducer.percentile([ Pct ]) , Geom , Scale ).get(Band) ) ;

} ;

var PctKey     = function(Name, Pct) { return Name + '_p' + Pct ; }                    ;

var DBToLinear = function(DBImage) { return ee.Image(10).pow( DBImage.divide(10) ) ; } ;

// —————————————————
// [4] Block Toggles
// —————————————————

var RUN = {

  CompositeCoverage       : true ,

  SpeckleSuppression      : true ,

  PhysicalRange           : true ,

  TemporalConsistency     : true ,

  CrossIndexPlausibility  : true ,

  NTLPlausibility         : true ,

  PopulationMass          : true ,

  TopographicDistribution : true ,

  GridAlignment           : true ,

  GapFilling3D            : true ,

  GLCMValidation          : true

} ;

// —————————————————————————————————————
// [4.1] Sentinel-1/2 Composite Coverage
// —————————————————————————————————————

if (RUN.CompositeCoverage) {

  var CovRows = [];

  Cities.forEach(function(City) {

    var SUHIFC    = Bundles[City].SUHI ;

    var Geom      = SUHIFC.geometry()  ;

    Bundles[City].Seasons.forEach(function(Season) {

      var Label       = Season.label                                                 ;

      var CandColl    = GetSentinel2Candidates( SUHIFC , Season.start , Season.end ) ;

      var S2Coll      = GetSentinel2( SUHIFC , Season.start , Season.end , false )   ;

      var S1Coll      = GetSentinel1Raw( SUHIFC , Season.start , Season.end )        ;

      var ObsCount    = S2Coll.select(ObsBand).count().rename('ObsCount')            ;

      var ObsFilled   = ObsCount.unmask(0)                                           ;

      var CountStats  = ReduceStats( ObsFilled , ee.Reducer.mean().combine(ee.Reducer.percentile([ 25 , 75 ]), '', true) , Geom , ScaleCORP ) ;

      var FracAny     = FractionOf( ObsFilled.gte(1) , 'FracAny' , Geom , ScaleCORP ) ;

      var ZeroObsFrac = FractionOf( ObsFilled.eq(0)  , 'ZeroObs' , Geom , ScaleCORP ) ;

      var CloudStats  = ReduceStats( CandColl.select(QABand).mean() ,

        ee.Reducer.mean().combine(ee.Reducer.percentile([ 5 ]), '', true) , Geom , ScaleCORP ) ;

      var CandCount   = CandColl.select(ObsBand).count().unmask(0).rename('CandCount')                                    ;

      var RelaxCount  = ApplyClearMask( CandColl , ClearRelaxed ).select(ObsBand).count().unmask(0).rename('RelaxCount')  ;

      var StrictCount = ApplyClearMask( CandColl , ClearStrict  ).select(ObsBand).count().unmask(0).rename('StrictCount') ;

      var SensStats   = ReduceStats( ee.Image.cat([

        CandCount , RelaxCount , StrictCount ,

        RelaxCount.eq(0).rename('ZeroRelax') , StrictCount.eq(0).rename('ZeroStrict') ]) ,

        ee.Reducer.mean() , Geom , ScaleCORP ) ;

      var CandMean      = ee.Number( SensStats.get('CandCount') ).max( DivideFloor )         ;

      var FINPImg       = LoadFINP(City, Label)                                              ;

      var SeasonalValid = ObsFilled.gt(0).rename('SeasonalValid')                            ;

      var FINPValid     = FINPImg.select(ReferenceBand).mask().unmask(0).rename('FINPValid') ;

      var Filled        = FINPValid.and(SeasonalValid.not()).rename('Filled')                ;

      var FINPFrac      = FractionOf( FINPValid , 'FINPValid' , Geom , ScaleCORP )           ;

      var FilledFrac    = FractionOf( Filled    , 'Filled'    , Geom , ScaleCORP )           ;

      CovRows.push(ee.Feature(null, {

        'City'                   : City                                                          ,

        'Season-Year'            : Label                                                         ,

        'S2-Scenes'              : S2Coll.size()                                                 ,

        'S1-Scenes'              : S1Coll.size()                                                 ,

        'Cand-Obs-Mean'          : SensStats.get('CandCount')                                    ,

        'Obs-Mean'               : CountStats.get('ObsCount_mean')                               ,

        'Obs-P25'                : CountStats.get('ObsCount_p25')                                ,

        'Obs-P75'                : CountStats.get('ObsCount_p75')                                ,

        'Retention-Frac'         : ee.Number( CountStats.get('ObsCount_mean') ).divide(CandMean) ,

        'Retention-Frac-Relaxed' : ee.Number( SensStats.get('RelaxCount')     ).divide(CandMean) ,

        'Retention-Frac-Strict'  : ee.Number( SensStats.get('StrictCount')    ).divide(CandMean) ,

        'Frac-Any-Coverage'      : FracAny                                                       ,

        'Zero-Obs-Frac'          : ZeroObsFrac                                                   ,

        'Zero-Obs-Frac-Relaxed'  : SensStats.get('ZeroRelax')                                    ,

        'Zero-Obs-Frac-Strict'   : SensStats.get('ZeroStrict')                                   ,

        'MeanClearSkyConf'       : CloudStats.get(QABand + '_mean')                              ,

        'P05ClearSkyConf'        : CloudStats.get(QABand + '_p5')                                ,

        'FINP-Valid-Frac'        : FINPFrac                                                      ,

        'Filled-By-Annual-Frac'  : FilledFrac                                                    ,

        'Clear-Threshold'        : ClearThreshold                                                ,

        'Threshold-Step'         : ThresholdStep

      })) ;

    }) ;

  }) ;

  Export.table.toDrive({

    collection  : ee.FeatureCollection(CovRows)                        ,

    description : 'Validation-CompositeCoverage'                       ,

    folder      : ExportFolder                                         ,

    fileFormat  : 'CSV'                                                ,

    selectors   : [ 'City' , 'Season-Year' , 'S2-Scenes' , 'S1-Scenes' ,

                  'Cand-Obs-Mean' , 'Obs-Mean' , 'Obs-P25' , 'Obs-P75' ,

                  'Retention-Frac' , 'Retention-Frac-Relaxed' , 'Retention-Frac-Strict' ,

                  'Frac-Any-Coverage' , 'Zero-Obs-Frac' , 'Zero-Obs-Frac-Relaxed' ,
                
                  'Zero-Obs-Frac-Strict' , 'MeanClearSkyConf'  , 'P05ClearSkyConf' ,

                  'FINP-Valid-Frac' , 'Filled-By-Annual-Frac' ,

                  'Clear-Threshold' , 'Threshold-Step' ]

  }) ;

}

// —————————————————————————
// [4.2] Speckle Suppression
// —————————————————————————

if (RUN.SpeckleSuppression) {

  var WaterGeom = {};

  Cities.forEach(function(City) {

    var Raw = LoadTIRPs(City)

      .filter( ee.Filter.eq(LCZClassProperty, WaterClassID) )

      .map(function(f) { return f.setGeometry(f.geometry().buffer(WaterErodeBuffer)) ; }) ;

    WaterGeom[City] = Raw ;

  }) ;

  var ENLofImage = function( LinearImg , WaterFC , Scale ) {

    var PolyENLs = WaterFC.map(function(f) {

      var Stats = ee.Dictionary( ReduceStats( LinearImg.rename('I'),

        ee.Reducer.mean()

                  .combine(ee.Reducer.variance() , '' , true)

                  .combine(ee.Reducer.count()    , '' , true) ,

        f.geometry() , Scale ) ) ;

      var N   = ee.Number( Stats.get('I_count', 0) ) ;

      var M   = ee.Number( ee.List([ Stats.get('I_mean') , 0 ]).reduce(ee.Reducer.max()) ) ;

      var V   = ee.Number( ee.List([ Stats.get('I_variance') , 0 ]).reduce(ee.Reducer.max()) ) ;

      var ENL = ee.Number(

        ee.Algorithms.If(

          N.gte(MinENLPixels) ,

          M.pow(2).divide(V.max(VarianceFloor)) ,

          ee.Number(0)

        )

      ) ;

      return ee.Feature( null , { 'ENL' : ENL }) ;

    }) ;

    var Clean = PolyENLs.filter( ee.Filter.gt( 'ENL' , 0 ) );

    return ee.Number( Clean.reduceColumns(ee.Reducer.median(), [ 'ENL' ]).get('median') ) ;

  } ;

  var ENLRows = [];

  Cities.forEach(function(City) {

    var SUHIFC    = Bundles[City].SUHI    ;

    var Geom      = WaterGeom[City]       ;

    Bundles[City].Seasons.forEach(function(Season) {

      var Label   = Season.label                                           ;

      var RawColl = GetSentinel1Raw( SUHIFC , Season.start , Season.end )  ;

      var NScenes = RawColl.size()                                         ;

      var RawENLs = ee.List(

        RawColl.toList(NScenes).map(function(Img) {

          var Lin = DBToLinear( ee.Image(Img).select(SpeckleBand) );

          return ENLofImage(Lin , Geom , ScaleNativeFINP)           ;

        })

      ) ;

      var Clean   = RawENLs.filter( ee.Filter.gt('item', 0) )                                 ;

      var ENLRaw  = ee.Number( Clean.reduce(ee.Reducer.median()) )                            ;

      var FINPImg = LoadFINP(City, Label)                                                     ;

      var VVLin   = DBToLinear( FINPImg.select(SpeckleBand).toFloat().divide(VVScaleFactor) ) ;

      var ENLComp = ENLofImage(VVLin, Geom, ScaleNativeFINP)                                  ;

      ENLRows.push(ee.Feature(null, {

        'City'            : City                              ,

        'Season-Year'     : Label                             ,

        'S1-Scenes'       : NScenes                           ,

        'ENL-Raw'         : ENLRaw                            ,

        'ENL-Composite'   : ENLComp                           ,

        'Effective-Looks' : ee.Number(ENLComp).divide(ENLRaw) ,

        'Looks-Ratio'     : ee.Number(ENLComp).divide(ENLRaw).divide(NScenes)

      })) ;

    }) ;

  }) ;

  Export.table.toDrive({

    collection  : ee.FeatureCollection(ENLRows)   ,

    description : 'Validation-SpeckleSuppression' ,

    folder      : ExportFolder                    ,

    fileFormat  : 'CSV'                           ,

    selectors   : [ 'City' , 'Season-Year' , 'S1-Scenes' , 'ENL-Raw' , 'ENL-Composite' , 'Effective-Looks' , 'Looks-Ratio' ]

  }) ;

}

// ————————————————————
// [4.3] Physical Range
// ————————————————————

if (RUN.PhysicalRange) {

  var RangeFeatures = [];

  var RangeReducer  = ee.Reducer.minMax().combine({

    reducer2     : ee.Reducer.percentile(RangePercentiles) ,

    sharedInputs : true

  }) ;

  var PushRangeRows = function( Stats , City , SeasonYear , Source ) {

    AllBands.forEach(function(Band) {

      var Row = {

        'City'        : City                     ,

        'Season-Year' : SeasonYear               ,

        'Source'      : Source                   ,

        'Band'        : Band                     ,

        'Min'         : Stats.get(Band + '_min') ,

        'Max'         : Stats.get(Band + '_max')

      } ;

      RangePercentiles.forEach(function(P) { Row['P' + P] = Stats.get( PctKey(Band, P) ) ; }) ;

      RangeFeatures.push( ee.Feature(null, Row) ) ;

    }) ;

  } ;

var ComputeRangeStats = function(Image, Geom, Scale) {

  return ReduceStats( Image.select(AllBands) , RangeReducer , Geom , Scale ) ;

} ;

ForEachCitySeason(function( City , Label ) {

  var Geom = Bundles[City].SUHI.geometry() ;

  TierImages( City , Label ).forEach(function(Tier) {

    PushRangeRows( ComputeRangeStats( Tier.Image , Geom , Tier.Scale ) , City , Label , Tier.Source ) ;

  }) ;

}) ;

  Export.table.toDrive({

    collection  : ee.FeatureCollection(RangeFeatures) ,

    description : 'Validation-PhysicalRange'          ,

    folder      : ExportFolder                        ,

    fileFormat  : 'CSV'                               ,

    selectors   : [ 'City' , 'Season-Year' , 'Source' , 'Band' , 'Min' , 'Max' ].concat( RangePercentiles.map(function(P) { return 'P' + P ; }) )

  }) ;

}

// ——————————————————————————
// [4.4] Temporal Consistency
// ——————————————————————————

if (RUN.TemporalConsistency) {

  var PrepareTIRPs = function(City) {

    var TIRPs     = LoadTIRPs(City).sort('system:index') ;

    var AllPoints = ee.List([])                          ;

    LCZIDs.forEach(function(LCZId) {

      var Subset      = TIRPs.filter( ee.Filter.eq(LCZClassProperty, LCZId) ).limit(TIRPPolygonLimit) ;

      var PolyList    = Subset.toList(TIRPPolygonLimit) ;

      var PointsBatch = PolyList.map(function(Poly) {

        Poly    = ee.Feature(Poly);

        var Pts = ee.FeatureCollection.randomPoints({

          region   : Poly.geometry()      ,

          points   : TIRPPointsPerPolygon ,

          seed     : TIRPSeed             ,

          maxError : RandomPointMaxError

        }) ;

        return Pts.map(function(Pt) {

          return Pt.set( LCZClassProperty , Poly.get(LCZClassProperty)).set('PolyID', Poly.get('system:index')) ;

        }).toList(TIRPPointsPerPolygon) ;

      }) ;

      AllPoints = AllPoints.cat( ee.List(PointsBatch).flatten() ) ;

    }) ;

    return ee.FeatureCollection(AllPoints).map(function(F) {

      F = ee.Feature(F);

      return F.set('City', City)

              .set('TIRP-ID'  , F.get('PolyID'))

              .set('PointKey' , ee.List( F.geometry().coordinates() ).join(','))  ;

    }) ;

  } ;

  var SamplePoints = function(Image, Points, City, SeasonYear, Source, Scale) {

    var NonSARBands   = AllBands.filter(function(B) { return !SARBands.includes(B) ; });

    var NonSARSampled = Image.select(NonSARBands).sampleRegions({

      collection : Points ,

      scale      : Scale  ,

      geometries : false

    }).map(function(F) {

      return F.set('City', City)

              .set('Season-Year' , SeasonYear)

              .set('Source'      , Source)

              .set('PointName'   , F.get(LCZClassProperty))  ;

    }) ;

    var BufferedPoints = Points.map(function(F) {

      return F.buffer(SARSampleBuffer).copyProperties(F) ;

    }) ;

    var SARSampled = Image.select(SARBands).reduceRegions({

      collection : BufferedPoints    ,

      reducer    : ee.Reducer.mean() ,

      scale      : Scale             ,

      tileScale  : SARTileScale

    }) ;

    var Joined = ee.Join.saveFirst('SARMatch').apply(

      NonSARSampled ,

      SARSampled    ,

      ee.Filter.equals({ leftField : 'PointKey' , rightField : 'PointKey' })

    ) ;

    return Joined.map(function(F) {

      var SARMatch = ee.Feature( F.get('SARMatch') );

      return F.set('VV'   , SARMatch.get('VV'))

              .set('VH'   , SARMatch.get('VH'))

              .set('Diff' , SARMatch.get('Diff'))  ;

    }) ;

  } ;

  var ConsistencyFeatures = [];

  Cities.forEach(function(City) {

    var CityTIRPs = PrepareTIRPs(City);

    Bundles[City].Seasons.forEach(function(Season) {

      var Label = Season.label;

      TierImages(City, Label).forEach(function(Tier) {

        ConsistencyFeatures.push( SamplePoints( Tier.Image , CityTIRPs , City , Label , Tier.Source , Tier.Scale ) ) ;

      }) ;

    }) ;

  }) ;

  Export.table.toDrive({

    collection  : ee.FeatureCollection(ConsistencyFeatures).flatten() ,

    description : 'Validation-TemporalConsistency'                    ,

    folder      : ExportFolder                                        ,

    fileFormat  : 'CSV'                                               ,

    selectors   : [ 'City' , 'Season-Year' , 'Source' , 'PointName' , 'TIRP-ID' ].concat(AllBands)

  }) ;

}

// ——————————————————————————————
// [4.5] Cross-Index Plausibility
// ——————————————————————————————

if (RUN.CrossIndexPlausibility) {

  var PlausibilityReducer = ee.Reducer.mean()

    .combine({ reducer2 : ee.Reducer.stdDev() , sharedInputs : true })

    .combine({ reducer2 : ee.Reducer.percentile(PlausPercentiles) , sharedInputs : true }) ;

  var ComputePlausibility = function(Image, City, SeasonYear, Source, Scale) {

    var Geom  = Image.geometry()                                                           ;

    var Stats = ReduceStats( Image.select(AllBands) , PlausibilityReducer , Geom , Scale ) ;

    var Row   = { 'City' : City , 'Season-Year' : SeasonYear , 'Source' : Source }         ;

    AllBands.forEach(function(Band) {

      Row[Band + '-mean']   = Stats.get(Band + '_mean')   ;

      Row[Band + '-stdDev'] = Stats.get(Band + '_stdDev') ;

      PlausPercentiles.forEach(function(P) { Row[Band + '-p' + P] = Stats.get( PctKey(Band, P) ) ; }) ;

    }) ;

    var TotalCount = ReduceStats( Image.select(ReferenceBand) , ee.Reducer.count() , Geom , Scale ).get(ReferenceBand) ;

    var VarMap     = {}                                                                                                ;

    AllBands.forEach(function(B) { VarMap[B] = Image.select(B) ; }) ;

    PlausibilityRules.forEach(function(Rule) {

      var ViolationSum         = ReduceStats( Image.expression(Rule.Expr, VarMap).rename('v') , ee.Reducer.sum() , Geom , Scale ).get('v') ;

      Row[Rule.Name + '-Frac'] = ee.Number(ViolationSum).divide( ee.Number(TotalCount) )                                                   ;

    }) ;

    return ee.Feature( null , Row ) ;

  } ;

  var PlausibilityFeatures = [] ;

  ForEachCitySeason(function(City, Label) {

    TierImages(City, Label).forEach(function(Tier) {

      PlausibilityFeatures.push( ComputePlausibility(Tier.Image, City, Label, Tier.Source, Tier.Scale) ) ;

    }) ;

  }) ;

  var PlausibilitySelectors = [ 'City' , 'Season-Year' , 'Source' ] ;

  AllBands.forEach(function(Band) {

    PlausibilitySelectors.push(Band + '-mean')   ;

    PlausibilitySelectors.push(Band + '-stdDev') ;

    PlausPercentiles.forEach(function(P) { PlausibilitySelectors.push(Band + '-p' + P) ; }) ;

  }) ;

  PlausibilityRules.forEach(function(Rule) { PlausibilitySelectors.push(Rule.Name + '-Frac') ; }) ;

  Export.table.toDrive({

    collection  : ee.FeatureCollection(PlausibilityFeatures) ,

    description : 'Validation-CrossIndexPlausibility'        ,

    folder      : ExportFolder                               ,

    fileFormat  : 'CSV'                                      ,

    selectors   : PlausibilitySelectors

  }) ;

}

// ——————————————————————
// [4.6] NTL Plausibility
// ——————————————————————

if (RUN.NTLPlausibility) {

  var NTLRows = [];

  Cities.forEach(function(City) {

    var SUHIFC = Bundles[City].SUHI                                ;

    var Geom   = SUHIFC.geometry()                                 ;

    var BCR    = UnscaleCube( LoadFINPStatic(City) ).select('BCR') ;

    Bundles[City].Seasons.forEach(function(Season) {

      var Label    = Season.label                                                                         ;

      var Unsc     = UnscaleCube( LoadFINP( City , Label ) )                                              ;

      var NTL      = Unsc.select('NTL')                                                                   ;

      var NDVI     = Unsc.select('NDVI')                                                                  ;

      var NTLHigh  = PercentileOf( NTL , 'NTL' , NTLHighPct , Geom , ScaleNativeFINP )                    ;

      var BCRLow   = PercentileOf( BCR , 'BCR' , BCRLowPct , Geom , ScaleNativeFINP )                     ;

      var NDVIHigh = PercentileOf( NDVI , 'NDVI' , NDVIHighPct , Geom , ScaleNativeFINP )                 ;

      var Frac1    = FractionOf( NTL.gt(NTLHigh).and(BCR.lt(BCRLow)) , 'R1' , Geom , ScaleNativeFINP )    ;

      var Frac2    = FractionOf( NTL.gt(NTLHigh).and(NDVI.gt(NDVIHigh)) , 'R2' , Geom , ScaleNativeFINP ) ;

      var NTLSrc   = ee.ImageCollection(NTLSourceCollection)

        .filterBounds(SUHIFC)

        .filterDate(Season.start , Season.end)

        .select(NTLSourceBand)

        .mean()

        .setDefaultProjection(NTLProjection)

        .rename('NTLSrc')

        .clip(SUHIFC) ;

      var NTLFINPAgg = NTL

        .reduceResolution({ reducer : ee.Reducer.mean() , maxPixels : ReduceResMaxPixels , bestEffort : true })

        .reproject(NTLProjection) ;

      var TileRatio                = NTLFINPAgg.divide( NTLSrc.max(NTLRatioFloor) ).rename('TileRatio')                       ;

      var TileRatioStats           = ReduceStats( TileRatio , ee.Reducer.percentile(TileRatioPercentiles) , Geom , ScaleNTL ) ;

      var Row                      = { 'City' : City , 'Season-Year' : Label }                                                ;

      Row[NTLHighCol]              = NTLHigh                                                                                  ;

      Row[BCRLowCol]               = BCRLow                                                                                   ;

      Row[NDVIHighCol]             = NDVIHigh                                                                                 ;

      Row['Frac-NTLhigh-BCRlow']   = Frac1                                                                                    ;

      Row['Frac-NTLhigh-NDVIhigh'] = Frac2                                                                                    ;

      TileRatioPercentiles.forEach(function(P) { Row['NTL-TileRatio-P' + P] = TileRatioStats.get( PctKey('TileRatio', P) ) ; }) ;

      NTLRows.push( ee.Feature(null, Row) ) ;

    }) ;

  }) ;

  Export.table.toDrive({

    collection  : ee.FeatureCollection(NTLRows)                                   ,

    description : 'Validation-NTLPlausibility'                                    ,

    folder      : ExportFolder                                                    ,

    fileFormat  : 'CSV'                                                           ,

    selectors   : [ 'City' , 'Season-Year' , NTLHighCol , BCRLowCol , NDVIHighCol ,

                    'Frac-NTLhigh-BCRlow' , 'Frac-NTLhigh-NDVIhigh' ].concat( TileRatioPercentiles.map(function(P) { return 'NTL-TileRatio-P' + P ; } ) )

  } ) ;

}

// —————————————————————
// [4.7] Population Mass
// —————————————————————

if (RUN.PopulationMass) {

  var PDRows = [] ;

  Cities.forEach(function(City) {

    var B         = Bundles[City]     ;

    var SUHIFC    = B.SUHI            ;

    var Geom      = SUHIFC.geometry() ;

    UniqueYears(B.Seasons).forEach(function(Year) {

      var RepSeason = B.Seasons.filter(function(S) { return String(S.LCZYear) === String(Year) ; })[0] ;

      if (!RepSeason) return ;

      var PDFINP  = UnscaleCube( LoadFINP(City, RepSeason.label) ).select('PD')                              ;

      var FINPSum = ee.Number( ReduceStats( PDFINP , ee.Reducer.sum() , Geom , ScaleNativeFINP ).get('PD') ) ;

var PDCol = B.Countries
 
  .map(function(Country) { var AssetPath = WorldPopBase + '/' + Country + '/' + PDFolder + '/' + Year ;
   
    return ee.ImageCollection( AssetPath ).filterBounds( SUHIFC ) ;
  
  })

     .reduce(function(Acc, IC) { return Acc.merge(IC) ; }, ee.ImageCollection([])) ;
 
      var Src         = PDCol.filterBounds(SUHIFC).mosaic().clip(SUHIFC).rename('PD')                                                      ;
 
      var SrcCountSum = ee.Number( ReduceStats( Src , ee.Reducer.sum() , Geom , ScaleWorldPop ).get('PD') )                                ;

      var SrcMassSum  = ee.Number( ReduceStats( Src.multiply(ee.Image.pixelArea()) , ee.Reducer.sum() , Geom , ScaleWorldPop ).get('PD') ) ;

      var FINPMassSum = FINPSum.multiply(PixelAreaFINP)                                                                                    ;

      PDRows.push(ee.Feature(null, {

        'City'              : City                                              ,

        'Year'              : Year                                              ,

        'FINP-Sum'          : FINPSum                                           ,

        'Src-Count-Sum'     : SrcCountSum                                       ,

        'Src-Mass-Sum'      : SrcMassSum                                        ,

        'FINP-Mass-Sum'     : FINPMassSum                                       ,

        'R-Mass-vs-Mass'    : FINPMassSum.divide( SrcMassSum.max(DivideFloor) ) ,

        'R-Raw-vs-SrcCount' : FINPSum.divide( SrcCountSum.max(DivideFloor) )

      })) ;

    }) ;

  }) ;

  Export.table.toDrive({

    collection  : ee.FeatureCollection(PDRows)                                      ,

    description : 'Validation-PopulationMass'                                       ,

    folder      : ExportFolder                                                      ,

    fileFormat  : 'CSV'                                                             ,

    selectors   : [ 'City' , 'Year' , 'FINP-Sum' , 'Src-Count-Sum' , 'Src-Mass-Sum' ,

                    'FINP-Mass-Sum' , 'R-Mass-vs-Mass' , 'R-Raw-vs-SrcCount' ]

  }) ;

}

// ——————————————————————————————
// [4.8] Topographic Distribution
// ——————————————————————————————

if (RUN.TopographicDistribution) {

  var TopoRows    = [] ;

  var TopoReducer = ee.Reducer.percentile(TopoPercentiles);

  var DiffReducer = ee.Reducer.mean()

    .combine(ee.Reducer.stdDev() , '' , true )

    .combine(ee.Reducer.percentile(TopoDiffPercentiles) , '' , true )  ;

  var TopoRow = function(City, Source, Stats, DiffStats) {

    var Row = { 'City' : City , 'Source' : Source };

    TopoBands.forEach(function(Band) {

      TopoPercentiles.forEach(function(P) {

        Row[ TopoPrefix[Band] + '-P' + P ] = Stats ? Stats.get( PctKey(Band, P) ) : null ;

      }) ;

    }) ;

    Row['Elev-Diff-Mean'] = DiffStats ? DiffStats.get('Diff_mean')   : null ;

    Row['Elev-Diff-SD']   = DiffStats ? DiffStats.get('Diff_stdDev') : null ;

    TopoDiffPercentiles.forEach(function(P) {

      Row[ 'Elev-Diff-P' + P ] = DiffStats ? DiffStats.get( PctKey('Diff', P) ) : null;

    }) ;

    return ee.Feature(null, Row) ;

  } ;

  Cities.forEach(function(City) {

    var SUHIFC   = Bundles[City].SUHI                  ;

    var Geom     = SUHIFC.geometry()                   ;

    var FINPUnsc = UnscaleCube( LoadFINPStatic(City) ) ;

    var CORPRaw  = LoadCORPStatic(City)                ;

    TopoRows.push( TopoRow( City , 'FINP' , ReduceStats( FINPUnsc.select(TopoBands) , TopoReducer , Geom , ScaleNativeFINP ) , null ) ) ;

    TopoRows.push( TopoRow( City , 'CORP' , ReduceStats( CORPRaw.select(TopoBands)  , TopoReducer , Geom , ScaleNativeCORP ) , null ) ) ;

    var LockedVIIRSProj = ee.Projection(VIIRSCRS, VIIRSCRSTransform);

    var FINPAgg         = FINPUnsc.select('Elevation')

                                  .reduceResolution({ reducer : ee.Reducer.mean() , maxPixels : ReduceResMaxPixels , bestEffort : true })
                            
                                  .reproject(LockedVIIRSProj) ;

    var DiffImg   = FINPAgg.subtract( CORPRaw.select('Elevation') ).rename('Diff') ;

    var DiffStats = ReduceStats( DiffImg , DiffReducer , Geom , ScaleNativeCORP )  ;

    TopoRows.push( TopoRow( City , 'FINP-vs-CORP' , null , DiffStats ) )           ;

  }) ;

  var TopoSelectors = [ 'City' , 'Source' ] ;

  TopoBands.forEach(function(Band) {

    TopoPercentiles.forEach(function(P) { TopoSelectors.push( TopoPrefix[Band] + '-P' + P ) ; }) ;

  }) ;

  TopoSelectors.push( 'Elev-Diff-Mean' , 'Elev-Diff-SD' ) ;

  TopoDiffPercentiles.forEach(function(P) { TopoSelectors.push( 'Elev-Diff-P' + P ) ; }) ;

  Export.table.toDrive({

    collection  : ee.FeatureCollection(TopoRows)       ,

    description : 'Validation-TopographicDistribution' ,

    folder      : ExportFolder                         ,

    fileFormat  : 'CSV'                                ,

    selectors   : TopoSelectors

  }) ;

}

// ————————————————————
// [4.9] Grid Alignment
// ————————————————————

if (RUN.GridAlignment) {

  var GridSignature = function(Image) {

    var Proj = Image.select(0).projection() ;

    return { 'CRS' : Proj.crs() , 'WKT' : Proj.wkt() } ;

  } ;

  var GridAligned = function(A, Ref) {

    var SameCRS = ee.Number( ee.Algorithms.If( ee.String(A.CRS).equals(ee.String(Ref.CRS)) , 1 , 0 ) ) ;
    
    var SameWKT = ee.Number( ee.Algorithms.If( ee.String(A.WKT).equals(ee.String(Ref.WKT)) , 1 , 0 ) ) ;
  
    var Aligned = SameCRS.multiply(SameWKT)                                                            ;
  
    return ee.Algorithms.If( Aligned , 'YES' , 'NO' )                                                  ;
    
  } ;

  var GridTiers = [

    { Tier : 'FINP' , Dynamic : LoadFINP , Static : LoadFINPStatic } ,

    { Tier : 'CORP' , Dynamic : LoadCORP , Static : LoadCORPStatic }

  ] ;

  var GridRows = [] ;

  Cities.forEach(function(City) {

    var Refs = {} ;

    GridTiers.forEach(function(T) { Refs[T.Tier] = GridSignature( T.Static(City) ) ; } ) ;

    Bundles[City].Seasons.forEach(function(Season) {

      var Label = Season.label ;

      GridTiers.forEach(function(T) {

        var Sig = GridSignature( T.Dynamic(City, Label) );

        GridRows.push(ee.Feature(null, {

          'City'        : City    ,

          'Season-Year' : Label   ,

          'Tier'        : T.Tier  ,

          'CRS'         : Sig.CRS ,

          'Aligned'     : GridAligned(Sig, Refs[T.Tier])

        })) ;

      }) ;

    }) ;

    var LCZPBase = Config.AssetRoot + '/STC/LCZP/' + City + '/' + City + '-' ;

    var LCZPRef  = GridSignature( ee.Image( LCZPBase + '2020' ) )            ;

    [ 2020 , 2021 , 2022 , 2023 , 2024 , 2025 ].forEach(function(Year) {

      // [1] Base LCZP

      var Sig = GridSignature( ee.Image( LCZPBase + Year ) );

      GridRows.push(ee.Feature(null, {

        'City'        : City         ,

        'Season-Year' : String(Year) ,

        'Tier'        : 'LCZP'       ,

        'CRS'         : Sig.CRS      ,

        'Aligned'     : GridAligned(Sig, LCZPRef)

      })) ;

      // [2] LCZP-GLCM

      var GLCMSig = GridSignature( ee.Image( LCZPBase + Year + '-GLCM' ) );

      GridRows.push(ee.Feature(null, {

        'City'        : City         ,

        'Season-Year' : String(Year) ,

        'Tier'        : 'LCZP-GLCM'  ,

        'CRS'         : GLCMSig.CRS  ,

        'Aligned'     : GridAligned( GLCMSig , LCZPRef )

      })) ;

    }) ;

  }) ;

  var ExpectedGridChecks = Cities.reduce(function(Sum, City) {

    return Sum + ( Bundles[City].Seasons.length * GridTiers.length ) + 12 ; } , 0 ) ;

  var GridFC = ee.FeatureCollection(GridRows);

  print( 'Grid Alignment - Total Checks' )                                                                                                 ;

  print( 'Total:' , GridFC.size(), '(' + ExpectedGridChecks + ' Expected' + ': Seasons x Tiers + LCZP + LCZP-GLCM, Summed Over Cities)' )  ;

  print( 'Not Aligned:' , GridFC.filter( ee.Filter.eq( 'Aligned' , 'NO' ) ).size() )                                                       ;

  Export.table.toDrive({
    
    collection  : GridFC                     ,
  
    description : 'Validation-GridAlignment' ,
  
    folder      : ExportFolder               ,
  
    fileFormat  : 'CSV'                      ,
  
    selectors   : [ 'City' , 'Season-Year' , 'Tier' , 'CRS' , 'Aligned' ]
  
  }) ;

}

// ————————————————————————————————
// [4.10] 3D Gap-Filling Validation
// ————————————————————————————————

if (RUN.GapFilling3D) {

  // ————————————————————————
  // [4.10.1] Local Constants
  // ————————————————————————

  var BlockKeepPct   = 25                                                    ; // % of 500 m Blocks To Keep

  var TileSizeDeg    = 5                                                     ;

  var GBABasePath    = 'projects/sat-io/open-datasets/GLOBAL_BUILDING_ATLAS' ;

  var DomainBasePath = Config.AssetRoot + '/Spatial-Domains'                 ;

  // ——————————————————————————————
  // [4.10.2] GBA Tile-Name Helpers
  // ——————————————————————————————

  var PadDigits = function(Value, Digits) {

    var Str = String(Math.abs(Value));

    while (Str.length < Digits) { Str = '0' + Str ; }

    return Str ;

  } ;

  var BuildTileName = function(LonFloor, LatFloor) {

    var LonPrefix       = LonFloor >= 0 ? 'e' : 'w'  ;

    var LatTop          = LatFloor + TileSizeDeg     ;

    var LatPrefixBottom = LatFloor >= 0 ? 'n' : 's'  ;

    var LatPrefixTop    = LatTop    >= 0 ? 'n' : 's' ;

    return LonPrefix + PadDigits(LonFloor, 3) + '_' + LatPrefixTop + PadDigits(LatTop, 2)

         + '_' + LonPrefix + PadDigits(LonFloor + TileSizeDeg, 3) + '_' + LatPrefixBottom + PadDigits(LatFloor, 2) ;

  } ;

  var GetOverlappingTileNames = function(LonMin, LonMax, LatMin, LatMax) {

    var Names    = []                                             ;

    var LonStart = Math.floor(LonMin / TileSizeDeg) * TileSizeDeg ;

    var LatStart = Math.floor(LatMin / TileSizeDeg) * TileSizeDeg ;

    for (var Lon = LonStart ; Lon < LonMax ; Lon += TileSizeDeg) {

      for (var Lat = LatStart ; Lat < LatMax ; Lat += TileSizeDeg) {

        Names.push(BuildTileName(Lon, Lat)) ;

      }

    }

    return Names ;

  } ;

  // —————————————
  // [4.10.3] nDSM 
  // —————————————

  var DSMRaw = ee.ImageCollection('JAXA/ALOS/AW3D30/V4_1').select('DSM').mosaic() ;

  var FABDEM = ee.ImageCollection('projects/sat-io/open-datasets/FABDEM')         ;

  var DTM    = FABDEM.mosaic().setDefaultProjection('EPSG:4326', null, 30)        ;

  var nDSM   = DSMRaw.subtract(DTM).max(0).rename('height')                       ;

  // ———————————————————————
  // [4.10.4] Per-City Table
  // ———————————————————————

  var BuildCityGapFillTable = function(CityName) {

    var Domain = ee.FeatureCollection(DomainBasePath + '/Complete-Domain/' + CityName ).geometry() ;

    var CRS    = Config.CityCRS[CityName].getInfo()                                                ;

    var Coords = ee.List(Domain.bounds(1).coordinates().get(0)).getInfo()                          ;

    var Lons   = Coords.map(function(P) { return P[0] ; })                                         ;

    var Lats   = Coords.map(function(P) { return P[1] ; })                                         ;

    var Tiles  = GetOverlappingTileNames(Math.min.apply( null , Lons ), Math.max.apply( null , Lons ) ,

                                     Math.min.apply( null , Lats ), Math.max.apply( null , Lats )) ;

    var Buildings = ee.FeatureCollection(Tiles.map(function(T) {

        return ee.FeatureCollection(GBABasePath + '/' + T) ;

      })).flatten()

      .filterBounds(Domain)

      .filter(ee.Filter.and( ee.Filter.neq( 'height' , null ) , ee.Filter.gt( 'height' , 0 ) )) ;

    // Deterministic Spatial Subsample

    var Kept = Buildings.map(function(F) {

      var C       = F.geometry().centroid(1).coordinates()                                    ;

      var Lon     = ee.Number(C.get(0))                                                       ;

      var Lat     = ee.Number(C.get(1))                                                       ;

      var Bx      = Lon.divide(0.005).floor()                                                 ;

      var By      = Lat.divide(0.005).floor()                                                 ;

      var BlockId = Bx.add(20000).multiply(40000).add(By.add(20000))                          ;

      var Keep    = BlockId.multiply(1664525).add(1013904223).abs().mod(100).lt(BlockKeepPct) ;

      return F.set({ lon : Lon , lat : Lat , keep : Keep }) ;

    }).filter(ee.Filter.eq( 'keep' , 1 ))

      .map(function(F) { return F.set( 'AreaM2' , F.geometry().area(1)) ; })

      .filter(ee.Filter.lt( 'AreaM2' , 50000 )) ;

    var WithFill = nDSM.reduceRegions({

      collection : Kept              ,

      reducer    : ee.Reducer.mean() ,

      scale      : 10                ,

      crs        : CRS               ,

      tileScale  : 4

    }) ;

    return WithFill.map(function(F) {

      return ee.Feature(null, {

        city          : CityName        ,

        lon           : F.get('lon')    ,

        lat           : F.get('lat')    ,

        AreaM2        : F.get('AreaM2') ,

        TruthGBA      : F.get('height') ,

        PredictednDSM : F.get('mean')

      }) ;

    }) ;

  } ;

  // ————————————————————————————————
  // [4.10.5] Table Assembly + Export
  // ————————————————————————————————

  var GapFillTable = Cities.map(BuildCityGapFillTable).reduce(function( Acc , FC ) {

    return Acc ? Acc.merge(FC) : FC ;

  }, null) ;

  // print('3D Gap-Fill - Sample rows:' , GapFillTable.limit(5)) ;

  Export.table.toDrive({

    collection     : GapFillTable            ,

    description    : 'Validation-3D-GapFill' ,

    folder         : ExportFolder            ,

    fileNamePrefix : 'Validation-3D-GapFill' ,

    fileFormat     : 'CSV'                   ,

    selectors      : [ 'city' , 'lon' , 'lat' , 'AreaM2' , 'TruthGBA' , 'PredictednDSM' ]

  }) ;

}

// ——————————————————————
// [4.11] GLCM Validation
// ——————————————————————

if (RUN.GLCMValidation) {

  var GLCMSpec     = FeatureLib.GLCMSpec                            ;

  var GLCMQuantise = FeatureLib.GLCMQuantise                        ;

  var GLCMQuantFeatures = []                                        ;

  var GLCMTexFeatures   = []                                        ;

  var GLCMBands    = [ 'VV' , 'VH' , 'B8' , 'B12' ]                 ;

  var GLCMRanges   = Config.GLCMRanges                              ;

  var Levels       = GLCMSpec.Levels                                ;

  var TestClasses  = [ 'LCZ1' , 'LCZ2' , 'LCZ3' , 'LCZA' , 'LCZG' ] ;

  var TileScale    = 4                                              ;

  Cities.forEach(function(City) {

    var LCZDomain     = ee.FeatureCollection(Config.AssetRoot + '/Spatial-Domains/LCZ-Domain/' + City) ;

    var LCZDomainGeom = LCZDomain.geometry()                                                           ;

    var TIRPs         = LoadTIRPs(City)                                                                ;

    var ClassGeoms    = {}                                                                             ;

    TestClasses.forEach(function(LCZClass) {

      ClassGeoms[LCZClass] = TIRPs.filter( ee.Filter.eq(LCZClassProperty, LCZClass) ).geometry() ;

    }) ;

    var Scopes = [ { Name : 'Domain' , Geom : LCZDomainGeom } ].concat( TestClasses.map(function(LCZClass) {

      return { Name : LCZClass , Geom : ClassGeoms[LCZClass] } ;

    }) ) ;

    UniqueYears(Bundles[City].Seasons).forEach(function(Year) {

      var LCZPAsset     = ee.Image( Config.AssetRoot + '/STC/LCZP/' + City + '/' + City + '-' + Year )           ;

      var LCZPGLCMAsset = ee.Image( Config.AssetRoot + '/STC/LCZP/' + City + '/' + City + '-' + Year + '-GLCM' ) ;

      var Unscaled      = Config.UnscaleCube(LCZPAsset)                                                          ;

      var GLCMUnscaled  = Config.UnscaleCube(LCZPGLCMAsset)                                                      ;

      // [A] Quantisation Adequacy (Pixels Outside The Frozen Range + Occupied Levels)

      var FlagBands  = [] ;

      var LevelBands = [] ;

      GLCMBands.forEach(function(Band) {

        var Raw = Unscaled.select(Band) ;

        FlagBands.push( Raw.lt( GLCMRanges[Band][0] ).rename(Band + '-Below') , Raw.gt( GLCMRanges[Band][1] ).rename(Band + '-Above') ) ;

        LevelBands.push( GLCMQuantise( Raw , Band ).rename(Band) ) ;

      }) ;

      var FlagImage  = ee.Image.cat(FlagBands)  ;

      var LevelImage = ee.Image.cat(LevelBands) ;

      Scopes.forEach(function(Scope) {

        var Flags = FlagImage.reduceRegion({

          reducer    : ee.Reducer.mean()   ,

          geometry   : Scope.Geom          ,

          scale      : ScaleNativeFINP     ,

          maxPixels  : MaxPixels           ,

          bestEffort : false               ,

          tileScale  : TileScale

        }) ;

        var Lev = LevelImage.reduceRegion({

          reducer    : ee.Reducer.percentile([ 5 , 50 , 95 ]) ,

          geometry   : Scope.Geom          ,

          scale      : ScaleNativeFINP     ,

          maxPixels  : MaxPixels           ,

          bestEffort : false               ,

          tileScale  : TileScale

        }) ;

        GLCMBands.forEach(function(Band) {

          GLCMQuantFeatures.push(ee.Feature(null, {

            City      : City                        ,

            Year      : Year                        ,

            Scope     : Scope.Name                  ,

            Band      : Band                        ,

            FracBelow : Flags.get(Band + '-Below')  ,

            FracAbove : Flags.get(Band + '-Above')  ,

            LevelP05  : Lev.get(Band + '_p5')       ,

            LevelP50  : Lev.get(Band + '_p50')      ,

            LevelP95  : Lev.get(Band + '_p95')      ,

            RangeMin  : GLCMRanges[Band][0]         ,

            RangeMax  : GLCMRanges[Band][1]         ,

            LevelMax  : Levels - 1

          })) ;

        }) ;

      }) ;

      // [B] TIRP Class Medians For Every Texture Feature (Band x Metric x Window)

      TestClasses.forEach(function(LCZClass) {

        var TexMedians = GLCMUnscaled.reduceRegion({

          reducer    : ee.Reducer.median() ,

          geometry   : ClassGeoms[LCZClass] ,

          scale      : ScaleNativeFINP     ,

          maxPixels  : MaxPixels           ,

          bestEffort : false               ,

          tileScale  : TileScale

        }) ;

        GLCMSpec.Bands.forEach(function(Band) {

          GLCMSpec.Metrics.forEach(function(Metric) {

            GLCMSpec.Windows.forEach(function(Win) {

              GLCMTexFeatures.push(ee.Feature(null, {

                City   : City                                                       ,

                Year   : Year                                                       ,

                Class  : LCZClass                                                   ,

                Band   : Band                                                       ,

                Metric : Metric.toUpperCase()                                       ,

                Window : Win                                                        ,

                Median : TexMedians.get( Band + '-' + Metric.toUpperCase() + '-' + Win )

              })) ;

            }) ;

          }) ;

        }) ;

      }) ;

    }) ;

  }) ;

  Export.table.toDrive({

    collection     : ee.FeatureCollection(GLCMQuantFeatures) ,

    description    : 'Validation-GLCM-Quantisation'          ,

    folder         : ExportFolder                            ,

    fileNamePrefix : 'Validation-GLCM-Quantisation'          ,

    fileFormat     : 'CSV'                                   ,

    selectors      : [ 'City' , 'Year' , 'Scope' , 'Band' , 'FracBelow' , 'FracAbove' , 'LevelP05' , 'LevelP50' , 'LevelP95' , 'RangeMin' , 'RangeMax' , 'LevelMax' ]

  }) ;

  Export.table.toDrive({

    collection     : ee.FeatureCollection(GLCMTexFeatures)   ,

    description    : 'Validation-GLCM-Texture'               ,

    folder         : ExportFolder                            ,

    fileNamePrefix : 'Validation-GLCM-Texture'               ,

    fileFormat     : 'CSV'                                   ,

    selectors      : [ 'City' , 'Year' , 'Class' , 'Band' , 'Metric' , 'Window' , 'Median' ]

  }) ;

}

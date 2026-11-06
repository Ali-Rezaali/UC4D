// —————————————————————————————————————
// [1] Global Parameters & Configuration
// —————————————————————————————————————

var Config                    = require('users/alirezaali/UC4D:01 Configurations') ;

var Visualization             = Config.Visualization                               ;

var CityRegistry              = Config.CityRegistry                                ;

var Cities                    = Config.PrimaryTargets                              ;

var TrainingDomainBuffer      = 125000                                             ;

var HoldoutSimplifyError      = 50                                                 ;

var TrainingSimplifyError     = 750                                                ;

var CompleteSimplifyError     = 750                                                ;

var SampleBufferMeters        = 250                                                ;

var SampleSimplifyError       = 100                                                ;

var LCZCleanError             = 10                                                 ;

var SpatialDomainsDriveFolder = Config.SpatialDomainsDriveFolder                   ;

var LCZSampleBasePath         = Config.AssetRoot + '/Samples/LCZ/'                 ;

var SUHIBasePath              = Config.AssetRoot + '/Spatial-Domains/SUHI-Domain/' ;

var SpatialDomainsBasePath    = Config.AssetRoot + '/Spatial-Domains/'             ;


// ————————————————————————————————————
// [1.1] SUHI Domain Parameters
// ————————————————————————————————————

var SUHIAreaMultiplier        = 3                                                  ; // Land Area Of Domain = k x Land Area Of Holdout (Per-City Override: CityRegistry[ City ].SUHIMultiplier)

var SUHICushion               = 1000                                               ; // Outer Safety Cushion (m)

var SUHIBufferError           = 25                                                 ; // maxError (m) For Every Buffer Inside The Solver

var SUHIAreaError             = 10                                                 ; // maxError (m) For Every Area Measurement

var SUHICleanError            = 10                                                 ; // maxError (m) For The Final Topology Clean

var SUHISolverIterations      = 8                                                  ; // Secant Iterations

var SUHISolverMaxFactor       = 6.0                                                ; // Distance Cap = Factor x Steiner Distance (Flags Near-Islands When Hit)


// ————————————————————————————————
// [1.2] Switch (Enabler/Disablers)
// ————————————————————————————————

var Switch = {

  Domains   : { Holdout : true  , Training : true  , Complete : true  , LCZ : false , SUHI : false } ,

  Visualize : { Holdout : true  , Training : true , Complete : true , LCZ : false , SUHI : false } ,

  Export    : { ToAsset : true  , ToDrive  : true } ,

  Verify    : { Domain : true }

} ;


// ————————————————
// [2] Data Sources
// ————————————————

var GAUL_L1    = ee.FeatureCollection( Config.GAUL_L1 )   ;

var GAUL_L2    = ee.FeatureCollection( Config.GAUL_L2 )   ;

var WBOB_ADM0  = ee.FeatureCollection( Config.WBOB_ADM0 ) ;

var WBOB_ADM1  = ee.FeatureCollection( Config.WBOB_ADM1 ) ;

var WBOB_ADM2  = ee.FeatureCollection( Config.WBOB_ADM2 ) ;

var LCZAssets  = {}                                       ;

var LCZSamples = {}                                       ;

if ( Switch.Domains.LCZ ) {

  Cities.forEach( function( City ) {

    LCZAssets[ City ] = LCZSampleBasePath + City          ;

    try {

      LCZSamples[ City ] = ee.FeatureCollection( LCZAssets[ City ] ) ;

    } catch ( e ) {

      LCZSamples[ City ] = null ;

      print( City + ': LCZ TIRP Asset Missing → LCZ Domain Will Fall Back To SUHI Domain.' ) ;

    }

  } ) ;

}


// ————————————————————————————
// [3] Spatial Helper Functions
// ————————————————————————————

// [3.1] Topology Cleaner

function CleanToPolygons( Input , MaxError ) {

  var Err = MaxError || 10 ;

  var FC = ee.FeatureCollection(

    ee.Algorithms.If(

      ee.String( ee.Algorithms.ObjectType( Input ) ).equals( 'FeatureCollection' ) ,

      Input ,

      ee.FeatureCollection( [ ee.Feature( Input ) ] )

    )

  ) ;

  var CleanGeom = FC.union( Err ).geometry().buffer( 0 , Err ).simplify( Err ).transform( 'EPSG:4326' , Err ) ;

  return ee.FeatureCollection( [ ee.Feature( CleanGeom ) ] ) ;

}

// [3.2] Geometry Simplifier

function SimplifyGeometry( FC , MaxError ) {

  return FC.map( function( Feature ) {

    return Feature.setGeometry( Feature.geometry().simplify( { maxError : MaxError } ) ) ;

  } ) ;

}

// [3.3] Training Domain Generator

function CreateTrainingDomain( HoldoutFC , BufferMeters , SimplifyError ) {

  var HoldoutGeom        = HoldoutFC.geometry()                               ;

  var Buffered           = HoldoutGeom.buffer( BufferMeters )                 ;

  var SimplifiedBuffered = Buffered.simplify( { maxError : SimplifyError } )  ;

  var Training           = SimplifiedBuffered.difference( HoldoutGeom , 100 ) ;

  return ee.FeatureCollection( [ ee.Feature( Training ) ] )                   ;

}


// ———————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
//
//   [3.4] City Resolver
//
//   'Asset' → Load the Registered Asset Directly, Dissolve If Requested.
//
//   'GAUL'  → Query Both GAUL 2024 L1 and L2 With inList Over The Alias Set, Merge, Then Apply the Country Filter (gaul0_name).
//
//   'WBOB'  → Query WBOB ADM2 → ADM1 → ADM0 With inList Over The Alias Set, Apply Country Filter (NAM_0) When CountryAliases is Declared.
//
// ———————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

function ResolveCity( City ) {

  var Entry      = CityRegistry[ City ]                     ;

  var Source     = Entry.source                             ;

  var Aliases    = Entry.aliases      || [ City ]           ;

  var Countries  = Entry.CountryAliases || []               ;

  // [3.4.1] Asset

  if ( Source === 'Asset' ) {

    var FC = ee.FeatureCollection( Entry.path ) ;

    return Entry.dissolve ? FC.union( 1 ) : FC  ;

  }

  // [3.4.2] GAUL 2024

  if ( Source === 'GAUL' ) {

    var Level = Entry.level || 'both' ;

    var Match ;

    if ( Level === 'L1' ) {

      Match = GAUL_L1.filter( ee.Filter.inList( 'gaul1_name' , Aliases ) )   ;

    } else if ( Level === 'L2' ) {

      Match = GAUL_L2.filter( ee.Filter.inList( 'gaul2_name' , Aliases ) )   ;

    } else {

      var L1 = GAUL_L1.filter( ee.Filter.inList( 'gaul1_name' , Aliases ) )  ;

      var L2 = GAUL_L2.filter( ee.Filter.inList( 'gaul2_name' , Aliases ) )  ;

      Match  = L2.merge( L1 )                                                ;

    }

    if ( Countries.length ) {

      Match = Match.filter( ee.Filter.inList( 'gaul0_name' , Countries ) ) ;

    }

    return Match ;

  }

  // [3.4.3] WBOB (World Bank Official Boundaries)

  if ( Source === 'WBOB' ) {

    var M2 = WBOB_ADM2.filter( ee.Filter.and(

      ee.Filter.inList( 'NAM_2' , Aliases ) ,

      ee.Filter.neq( 'NAM_2' , 'Administrative unit not available' )

    ) ) ;

    var M1 = WBOB_ADM1.filter( ee.Filter.inList( 'NAM_1' , Aliases ) ) ;

    var M0 = WBOB_ADM0.filter( ee.Filter.inList( 'NAM_0' , Aliases ) ) ;

    if ( Countries.length ) {

      M2 = M2.filter( ee.Filter.inList( 'NAM_0' , Countries ) ) ;

      M1 = M1.filter( ee.Filter.inList( 'NAM_0' , Countries ) ) ;

      M0 = M0.filter( ee.Filter.inList( 'NAM_0' , Countries ) ) ;

    }

    return ee.FeatureCollection(

      ee.Algorithms.If( M2.size().gt( 0 ) , M2 ,

      ee.Algorithms.If( M1.size().gt( 0 ) , M1 ,

      M0 ) )

    ) ;

  }

  return ee.FeatureCollection( [] ) ;

}


// ———————————————————————————
// [3.5] SUHI Domain Generator
// ———————————————————

// [3.5.1] Local Land Mask

function LocalLand( Geom , ReachMeters ) {

  var Envelope = Geom.buffer( ReachMeters , 100 ).bounds() ;

  return WBOB_ADM0

    .filterBounds( Envelope )

    .geometry()

    .intersection( Envelope , 100 )

    .simplify( 100 ) ;

}

// [3.5.2] Secant Distance Solver

function SolveDistance( Measure , Target , DStart , DMin , DMax , Iterations ) {

  var DPrev = ee.Number( DStart ).max( DMin ).min( DMax ) ;

  var FPrev = Measure( DPrev )                            ;

  var DCur  = DPrev.multiply( 1.1 ).min( DMax )           ;

  var FCur  = Measure( DCur )                             ;

  for ( var i = 0 ; i < Iterations ; i++ ) {

    var Denom = FCur.subtract( FPrev ) ;

    var Step  = ee.Number( ee.Algorithms.If(

      Denom.abs().lt( 1 ) ,

      0 ,

      ee.Number( Target ).subtract( FCur ).multiply( DCur.subtract( DPrev ) ).divide( Denom )

    ) ) ;

    var DNext = DCur.add( Step ).max( DMin ).min( DMax ) ;

    var FNext = Measure( DNext )                         ;

    DPrev     = DCur                                     ;
    
    FPrev     = FCur                                     ;

    DCur      = DNext                                    ;
    
    FCur  = FNext                                        ;

  }

  return { D : DCur , F : FCur } ;

}

// [3.5.3] Domain Generator

function CreateSUHIDomain( HoldoutFC , Multiplier ) {

  var HGeom   = HoldoutFC.geometry().dissolve( { maxError : 50 } ) ;

  var AreaRaw = ee.Number( HGeom.area( 1 ) )                       ;

  var PerimP  = ee.Number( HGeom.perimeter( 1 ) )                  ;

  // (1) Steiner Starting Distance (Unclipped, Convex Approximation)

  var RingRaw = AreaRaw.multiply( Multiplier - 1 ) ;

  var D0      = PerimP.multiply( -1 )

                  .add( PerimP.pow( 2 ).add( RingRaw.multiply( 4 * Math.PI ) ).sqrt() )

                  .divide( 2 * Math.PI ) ;

  var DCap    = D0.multiply( SUHISolverMaxFactor ) ;

  // (2) Land Mask Sized For The Largest Distance The Solver May Try

  var Reach   = DCap.add( 2 * SUHICushion )               ;

  var Land     = LocalLand( HGeom , Reach )               ;

  var HLand    = HGeom.intersection( Land , 100 )         ;

  var AreaL    = ee.Number( HLand.area( SUHIAreaError ) ) ;

  var Target   = AreaL.multiply( Multiplier )             ;

  // (3) Solve Land-Compensated Area Multiplier

  var Measure  = function( D ) {

    return ee.Number( HGeom.buffer( D , SUHIBufferError ).intersection( Land , SUHIBufferError ).area( SUHIAreaError ) ) ;

  } ;

  var Sol      = SolveDistance( Measure , Target , D0 , 1 , DCap , SUHISolverIterations ) ;

  var DFinal   = Sol.D ;

  // (4) Final Domain : Buffer + Cushion + Land Clip + Topology Clean (Cleaned Once, Used Everywhere)

  var Padded   = HGeom.buffer( DFinal , SUHIBufferError ).buffer( SUHICushion , 100 ) ;

  var FinalFC  = CleanToPolygons( ee.FeatureCollection( [ ee.Feature( Padded.intersection( Land , 100 ) ) ] ) , SUHICleanError ) ;

  var FinalGeom = FinalFC.geometry() ;

  var Info = {

    Multiplier            : Multiplier                                                   ,

    Holdout_Land_km2      : AreaL.divide( 1e6 )                                          ,

    Target_km2            : Target.divide( 1e6 )                                         ,

    Domain_Land_km2       : Sol.F.divide( 1e6 )                                          ,

    Domain_Ratio          : Sol.F.divide( AreaL )                                        , // Should Be ≈ Multiplier

    Domain_ErrorPct       : Sol.F.subtract( Target ).divide( Target ).multiply( 100 )    ,

    Distance_m            : DFinal                                                       ,

    Steiner_D0_m          : D0                                                           ,

    SolverCapped          : DFinal.gte( DCap.multiply( 0.999 ) )                         , // true → Near-Island, Read With Care

    Final_Cleaned_km2     : ee.Number( FinalGeom.area( SUHIAreaError ) ).divide( 1e6 )

  } ;

  return { FC : FinalFC , Info : ee.Dictionary( Info ) } ;

}


// ——————————————————————————
// [4] Define Holdout Domains
// ——————————————————————————

var HoldoutDomains = {} ;

Cities.forEach( function( City ) {

  HoldoutDomains[ City ] = SimplifyGeometry( ResolveCity( City ) , HoldoutSimplifyError ) ;

} ) ;


// —————————————————————————————————————————————————
// [5] Define Training, Complete, SUHI & LCZ Domains
// —————————————————————————————————————————————————

var TrainingDomains = {} , CompleteDomains = {} , SUHIDomains = {} , LCZDomains = {} , SUHIVerification = {} ;

Cities.forEach( function( City ) {

  // Training Is Dependent On Complete, So Compute It Whenever Either Is Switched On.

  if ( Switch.Domains.Training || Switch.Domains.Complete ) {

    TrainingDomains[ City ] = CreateTrainingDomain( HoldoutDomains[ City ] , TrainingDomainBuffer , TrainingSimplifyError ) ;

  }

  if ( Switch.Domains.Complete ) {

    CompleteDomains[ City ] = SimplifyGeometry( CleanToPolygons( TrainingDomains[ City ].merge( HoldoutDomains[ City ] ) ) , CompleteSimplifyError ) ;

  }

  // SUHI Is Computed BEFORE LCZ, So The LCZ Domain Always Uses The Fresh In-Memory SUHI Domain (Never A Stale Asset).

  if ( Switch.Domains.SUHI ) {

    var Multiplier           = CityRegistry[ City ].SUHIMultiplier || SUHIAreaMultiplier ;

    var SUHIResult           = CreateSUHIDomain( HoldoutDomains[ City ] , Multiplier )   ;

    SUHIDomains[ City ]      = SUHIResult.FC                                             ;

    SUHIVerification[ City ] = SUHIResult.Info                                           ;

    if ( Switch.Verify.Domain ) {

      print( City + ' SUHI Domain Verification (Domain_Ratio ≈ k | SolverCapped = 0):' , SUHIResult.Info ) ;

    }

  }

  if ( Switch.Domains.LCZ ) {

    var SUHIBase            = SUHIDomains[ City ] || ee.FeatureCollection( SUHIBasePath + City )   ;

    if ( !SUHIDomains[ City ] ) SUHIDomains[ City ] = SUHIBase                                     ;

    // print( City + ' LCZ Boundary Metadata:' , SUHIBase )                                        ;

    // print( City + ' Total Calculated Area (km²):'  , SUHIBase.geometry().area().divide( 1e6 ) ) ;

    if ( !LCZSamples[ City ] ) {

      LCZDomains[ City ] = SUHIBase ;

      print( City + ': LCZ TIRP Asset Missing → LCZ Domain = SUHI Domain.' ) ;

    } else {

      LCZDomains[ City ] = ee.FeatureCollection( ee.Algorithms.If(

        LCZSamples[ City ].size().gt( 0 ) ,

        CleanToPolygons( SUHIBase.merge( SimplifyGeometry( ee.FeatureCollection( [ ee.Feature( LCZSamples[ City ].geometry().buffer( SampleBufferMeters ) ) ] ) , SampleSimplifyError ) ) , LCZCleanError ) ,

        SUHIBase

      ) ) ;

      print( City + ' LCZ TIRP Sample Count (0 → LCZ Domain Fell Back To SUHI):' , LCZSamples[ City ].size() ) ;

    }

  }

} ) ;


// —————————————————
// [6] Visualization
// —————————————————

// [6.1] Define Styles

var HoldoutStyle = Visualization.HoldoutStyle, TrainingStyle = Visualization.TrainingStyle, CompleteStyle = Visualization.CompleteStyle, LCZDomainStyle = Visualization.LCZDomainStyle, BoundaryStyle = Visualization.BoundaryStyle ;

// [6.2] Add Layers

Cities.forEach( function( City ) {

  if ( Switch.Visualize.Training && TrainingDomains[ City ] )

    Map.addLayer( TrainingDomains[ City ].style( TrainingStyle ) , {} , City + ' Training Domain'  , false ) ;

  if ( Switch.Visualize.Holdout && HoldoutDomains[ City ] )

    Map.addLayer( HoldoutDomains[ City ].style( HoldoutStyle )   , {} , City + ' Holdout Domain'   , false ) ;

  if ( Switch.Visualize.Complete && CompleteDomains[ City ] )

    Map.addLayer( CompleteDomains[ City ].style( CompleteStyle ) , {} , City + ' Complete Domain'  , false ) ;

  if ( Switch.Visualize.LCZ && LCZDomains[ City ] )

    Map.addLayer( LCZDomains[ City ].style( LCZDomainStyle )     , {} , City + ' LCZ Domain'       , false ) ;

  if ( Switch.Visualize.SUHI && SUHIDomains[ City ] )

    Map.addLayer( SUHIDomains[ City ].style( BoundaryStyle )     , {} , City + ' SUHI Domain'      , false ) ;

} ) ;


// ————————————————
// [7] Asset Export
// ————————————————

var DomainTypes = [

  { Suffix : 'Holdout'  , Dict : HoldoutDomains  , Folder : 'Holdout-Domain'  } ,

  { Suffix : 'Training' , Dict : TrainingDomains , Folder : 'Training-Domain' } ,

  { Suffix : 'Complete' , Dict : CompleteDomains , Folder : 'Complete-Domain' } ,

  { Suffix : 'LCZ'      , Dict : LCZDomains      , Folder : 'LCZ-Domain'      } ,

  { Suffix : 'SUHI'     , Dict : SUHIDomains     , Folder : 'SUHI-Domain'     }

] ;

var ExportList = [] ;

Cities.forEach( function( City ) {

  DomainTypes.forEach( function( Domain ) {

    if ( !Switch.Domains[ Domain.Suffix ] ) return ;

    if ( !Domain.Dict[ City ] ) return             ;

    ExportList.push( {

      fc     : Domain.Dict[ City ]                 ,

      name   : City                                ,

      folder : Domain.Folder

    } ) ;

  } ) ;

} ) ;

if ( Switch.Export.ToAsset ) {

  ExportList.forEach( function( Item ) {

    Export.table.toAsset( {

      collection  : Item.fc                                                 ,

      description : Item.name + '-' + Item.folder + '-Asset'                ,

      assetId     : SpatialDomainsBasePath + Item.folder + '/' + Item.name  ,

      overwrite   : true

    } ) ;

  } ) ;

}


// ———————————————————————
// [8] Google Drive Export
// ———————————————————————

if ( Switch.Export.ToDrive ) {

  Cities.forEach( function( City ) {

    var DriveExports = [] ;

    if ( Switch.Domains.Holdout  && HoldoutDomains[ City ] )

      DriveExports.push( { collection : CleanToPolygons( HoldoutDomains[ City ] )  , name : City + '-Holdout-Domain'  } ) ;

    if ( Switch.Domains.Training && TrainingDomains[ City ] )

      DriveExports.push( { collection : CleanToPolygons( TrainingDomains[ City ] ) , name : City + '-Training-Domain' } ) ;

    if ( Switch.Domains.Complete && CompleteDomains[ City ] )

      DriveExports.push( { collection : CleanToPolygons( CompleteDomains[ City ] ) , name : City + '-Complete-Domain' } ) ;

    if ( Switch.Domains.LCZ && LCZDomains[ City ] )

      DriveExports.push( { collection : LCZDomains[ City ]                         , name : City + '-LCZ-Domain'      } ) ;

    // SUHI Is Already Cleaned Once At Creation, So Asset, Drive & Verification All Share Identical Geometry.

    if ( Switch.Domains.SUHI && SUHIDomains[ City ] )

      DriveExports.push( { collection : SUHIDomains[ City ]                        , name : City + '-SUHI-Domain'     } ) ;

    DriveExports.forEach( function( Item ) {

      Export.table.toDrive( {

        collection     : Item.collection           ,

        description    : Item.name + '-Drive'      ,

        folder         : SpatialDomainsDriveFolder ,

        fileNamePrefix : Item.name                 ,

        fileFormat     : 'GeoJSON' 

      } ) ;

    } ) ;

  } ) ;

}

// ———————————————————————————————————————————
// [1] Module Configuration & Asset References
// ———————————————————————————————————————————

var Config             = require('users/alirezaali/UC4D:01 Configurations')             ;

var csPlus             = ee.ImageCollection('GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED') ;

var QABand             = 'cs_cdf'                                                       ;

var ClearThreshold     = 0.80                                                           ;

var CloudyPixelPcnt    = 80                                                             ;

exports.csPlus         = csPlus                                                         ;

exports.QABand         = QABand                                                         ;

exports.ClearThreshold = ClearThreshold                                                 ;

var ResamplingMethod   = Config.ResamplingMethod                                        ;

var WorldPopFolder     = Config.WorldPopFolder                                          ;

var FABDEMProjection   = Config.FABDEMProjection                                        ;

var PDProjection       = Config.PDProjection                                            ;

var NTLProjection      = Config.NTLProjection                                           ;

// ———————————————————————————————
// [2] Sentinel-1 Collection (SAR)
// ———————————————————————————————

var GetSentinel1 = function( Domain , StartDate , EndDate ) {
  
  var S1 = ee.ImageCollection('COPERNICUS/S1_GRD')
  
    .filterBounds(Domain)
  
    .filterDate(StartDate, EndDate)
  
    .filter(ee.Filter.eq('instrumentMode', 'IW'))
  
    .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
  
    .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
  
    .map(function(Image) { 

    // [2.1] Convert dB (Sigma0) Directly to Linear Power Space
    
    var vvLin = ee.Image(10.0).pow(Image.select('VV').divide(10.0))               ;

    var vhLin = ee.Image(10.0).pow(Image.select('VH').divide(10.0))               ;
    
    // [2.2] Return Linear Layers to Protect Temporal Aggregation Accuracy

    return ee.Image.cat([ vvLin.rename('VV_lin') , vhLin.rename('VH_lin') ])})    ; 

   // [2.3] Temporal Aggregation in Linear Power Space

   var MeanS1 = S1.mean()                                                         ;

   // [2.4] Convert Aggregated Base Intensities Back to Logarithmic Decibels (dB)

   var VV = ee.Image(10.0).multiply(MeanS1.select('VV_lin').log10()).rename('VV') ;

   var VH = ee.Image(10.0).multiply(MeanS1.select('VH_lin').log10()).rename('VH') ;
  
   // [2.5] Cross-Polarization Difference (dB)

  var Diff = VV.subtract( VH ).rename( 'Diff' );
  
   // [2.6] Component Assembly Into a Raster Stack

   return VV.addBands([ VH , Diff ]).toFloat() ;
  
} ;

// —————————————————————————
// [3] Sentinel-2 Collection
// —————————————————————————

// [3.1] Candidate Observations (Scene Filter + Cloud Score+ Link, Before Pixel Masking)

var GetSentinel2Candidates = function( Domain , Start , End ) {
  
  var csPlusFiltered = csPlus
    
    .filterBounds( Domain )
    
    .filterDate( Start , End ) ;
    
  return ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  
    .filterBounds( Domain )
    
    .filterDate( Start , End )

    .filter(ee.Filter.lt( 'CLOUDY_PIXEL_PERCENTAGE' , CloudyPixelPcnt ))

    .linkCollection( csPlusFiltered , [ QABand ] ) 

    .select([ 'B1' , 'B2' , 'B3' , 'B4' , 'B5' , 'B6' , 'B7' , 'B8' , 'B8A' , 'B9' , 'B11' , 'B12' , QABand ]) ;
    
} ;

// [3.2] Pixel-Level Clear-Sky Mask At A Given cs_cdf Threshold

var ApplyClearMask = function( Collection , Threshold ) {
  
  return Collection.map(function(img) { 
      
    var Masked = img.updateMask(img.select( QABand ).gte( Threshold ));
        
    return Masked ;
   
  }) ;
    
} ;

// [3.3] Production Collection (Candidates Masked At The Library Threshold)

var GetSentinel2 = function( Domain , Start , End , IsCoarse ) {
  
  return ApplyClearMask( GetSentinel2Candidates( Domain , Start , End ) , ClearThreshold ) ;
    
} ;

exports.GetSentinel1           = GetSentinel1           ;

exports.GetSentinel2           = GetSentinel2           ;

exports.GetSentinel2Candidates = GetSentinel2Candidates ;

exports.ApplyClearMask         = ApplyClearMask         ;

exports.GetSentinel1Raw = function( Domain , Start , End ) {

  return ee.ImageCollection('COPERNICUS/S1_GRD')

    .filterBounds(Domain).filterDate( Start , End )

    .filter(ee.Filter.eq( 'instrumentMode' , 'IW' ))

    .filter(ee.Filter.listContains( 'transmitterReceiverPolarisation' , 'VV' ))

    .filter(ee.Filter.listContains( 'transmitterReceiverPolarisation' , 'VH' )) ;
  
} ;

// —————————————————————————————————
// [4] Spectral Indices (Sentinel-2)
// —————————————————————————————————

var SpectralIndicesFunction = function(img) {
  
  // [4.1] Band Definition & Transient Scaling (0-1) 

  var Scaled = img.divide(10000)    ;

  var B1     = Scaled.select('B1')  ;

  var B2     = Scaled.select('B2')  ;

  var B3     = Scaled.select('B3')  ;

  var B4     = Scaled.select('B4')  ;

  var B5     = Scaled.select('B5')  ;

  var B6     = Scaled.select('B6')  ;

  var B7     = Scaled.select('B7')  ;

  var B8     = Scaled.select('B8')  ;

  var B8A    = Scaled.select('B8A') ;

  var B9     = Scaled.select('B9')  ;

  var B11    = Scaled.select('B11') ;

  var B12    = Scaled.select('B12') ;

  // [4.2] Spectral Indices Calculation
  
  var NDVI   = Scaled.normalizedDifference([ 'B8' , 'B4' ]).rename('NDVI')                                                                                                      ;
  
  var MSAVI2 = Scaled.expression( '(2 * B8 + 1 - sqrt(pow(2 * B8 + 1, 2) - 8 * (B8 - B4))) / 2' , { 'B8' : B8 , 'B4' : B4 } ).rename('MSAVI2')                                  ;
  
  var NDWI   = Scaled.normalizedDifference([ 'B3' , 'B8' ]).rename('NDWI')                                                                                                      ;

  var NDMI   = Scaled.normalizedDifference([ 'B8' , 'B11' ]).rename('NDMI')                                                                                                     ;
  
  var NDRE   = Scaled.normalizedDifference([ 'B8A' , 'B5' ]).rename('NDRE')                                                                                                     ;
  
  var BSI    = Scaled.expression('((B11 + B4) - (B8 + B2)) / ((B11 + B4) + (B8 + B2))' , { 'B11': B11 , 'B4': B4 , 'B8': B8 , 'B2': B2 }).rename('BSI')                         ;

  var MNDWI  = Scaled.normalizedDifference([ 'B3' , 'B11' ]).rename('MNDWI')                                                                                                    ;
  
  var EVI2   = Scaled.expression( '2.5 * ((B8 - B4) / (B8 + 2.4 * B4 + 1))' , { 'B8' : B8 , 'B4' : B4 } ).rename('EVI2')                                                        ;
  
  var BLFEI  = Scaled.expression( '(((B3 + B4 + B12) / 3.0) - B11) / (((B3 + B4 + B12) / 3.0) + B11)' , { 'B3' : B3 , 'B4' : B4 , 'B11' : B11 , 'B12' : B12 } ).rename('BLFEI') ;
    
  // [4.3] FVC & Emissivity Proxy | NDVI Thresholds Method, Simplified (SNDVITHM)
 
  //   Method     : Sobrino et al. (2008), IEEE TGRS 46(2), Eq. 9
 
  //   Constants  : Sobrino et al. (2004), RSE 90 — NDVIs = 0.2 , NDVIv = 0.5 , εv = 0.99 , εs = 0.97 (TM6 ASTER-Library Soil Mean)
 
  //   Pv (FVC)   : Carlson & Ripley (1997), Squared & Clamped To [0,1]

  var NDVISoil = 0.2  ;

  var NDVIVeg  = 0.5  ;

  var EpsSoil  = 0.97 ;

  var EpsVeg   = 0.99 ;

  var EpsWater = 0.99 ;

  var FVC      = NDVI.subtract( NDVISoil )

                      .divide(NDVIVeg - NDVISoil)

                      .clamp( 0 , 1 )

                      .pow(2)

                      .rename('FVC') ;

  var Emissivity = FVC.multiply( EpsVeg - EpsSoil ).add(EpsSoil)

                      .where( MNDWI.gt(0) , EpsWater )

                      .rename('Emissivity') ;                  

  // [4.4] Albedo Calculation (Bonafoni and Sekertekin, 2020)

  var Albedo = Scaled.expression('0.2266 * B2 + 0.1236 * B3 + 0.1573 * B4 + 0.3417 * B8 + 0.1170 * B11 + 0.0338 * B12' , { 'B2': B2 , 'B3': B3 , 'B4': B4 , 'B8' : B8 , 'B11': B11 , 'B12' : B12 }).rename('Albedo').clamp( 0 , 1 ) ;

  return Scaled.addBands([ NDVI , MSAVI2 , NDWI , NDMI , NDRE , BSI , MNDWI , EVI2 , BLFEI , FVC , Emissivity , Albedo ]);
    
};

exports.SpectralIndicesFunction = SpectralIndicesFunction ;

// ————————————————————————
// [5] Topographic Features
// ————————————————————————

var TopographicFeatures = function(Domain) {
  
  var DEM = ee.ImageCollection('projects/sat-io/open-datasets/FABDEM')
  
                 .filterBounds(Domain)
                          
                 .mosaic()
      
                 .setDefaultProjection(FABDEMProjection)                     ;

  var Elevation = DEM.select('b1').rename('Elevation')                       ;

  var Slope     = ee.Terrain.slope(Elevation).rename('Slope')                ;

  var AspectRad = ee.Terrain.aspect(Elevation).multiply(Math.PI).divide(180) ;

  var Northness = AspectRad.cos().rename('Northness')                        ;

  var Eastness  = AspectRad.sin().rename('Eastness')                         ;

  return ee.Image.cat( [ Elevation , Slope , Northness , Eastness ] ).resample(ResamplingMethod).clip(Domain) ;
  
};

// ————————————————————————————————
// [6] Spatiotemporal Cube Stacking
// ————————————————————————————————

exports.SpatiotemporalCube = function( Domain , StartDate , EndDate , City , Year , isDynamicOnly , IsCoarse , AnnualS2Fallback , PrecomputedPopDensity ) {

  var ExactMask = ee.Image.constant(1).clip(Domain).mask() ;
 
  var StartDt   = ee.Date(StartDate)                       ;
 
  var EndDt     = ee.Date(EndDate).advance( 1 , 'day' )    ;
  
  // ——————————————————————
  // [6.1] Dynamic Features 
  // ——————————————————————
  
  // ——————————————————
  // [6.1.1] Sentinel-1 
  // ——————————————————

  var S1 = GetSentinel1( Domain , StartDt , EndDt ).updateMask(ExactMask) ;
  
  // ——————————————————
  // [6.1.2] Sentinel-2 
  // ——————————————————
  
  // [6.1.2.1] Seasonal Mean (Raw Bands)

  var S2Collection = GetSentinel2( Domain , StartDt , EndDt , IsCoarse ).mean()
  
  .updateMask(ExactMask) 
 
  .select([ 'B1' , 'B2' , 'B3' , 'B4' , 'B5' , 'B6' , 'B7' , 'B8' , 'B8A' , 'B9' , 'B11' , 'B12' ]) ;

  // [6.1.2.2] Annual Mean (Backup Raw Bands) [Read from the Exported LCZP Asset]

  var S2Annual = AnnualS2Fallback
   
    ? AnnualS2Fallback.select([ 'B1' , 'B2' , 'B3' , 'B4' , 'B5' , 'B6' , 'B7' , 'B8' , 'B8A' , 'B9' , 'B11' , 'B12' ])
   
    : null ;
  
  // [6.1.2.3] Seasonal-Sentinel-2 Annual Gap-Filler

  var S2MeanRaw       = S2Annual ? S2Collection.unmask(S2Annual).updateMask(ExactMask) : S2Collection ;
  
  // [6.1.2.4] Extract Spectral Bands Directly From S2-Mean-Raw (Native 0-10000 DN range)
  
  var SpectralBands   = S2MeanRaw.select([ 'B1' , 'B2' , 'B3' , 'B4' , 'B5' , 'B6' , 'B7' , 'B8' , 'B8A' , 'B9' , 'B11' , 'B12' ])                             ;
  
  // [6.1.2.5] Compute Indices On Composite (0.0 to 1.0 Float Range)
  
  var S2Mean          = SpectralIndicesFunction(S2MeanRaw)                                                                                                     ;
  
  var SpectralIndices = S2Mean.select([ 'NDVI' , 'MSAVI2' , 'NDWI' , 'NDMI' , 'NDRE' , 'BSI' , 'MNDWI' , 'EVI2' , 'BLFEI' , 'Emissivity' , 'Albedo' , 'FVC' ]) ;
  
  // ——————————————————————————————————————
  // [6.1.3] VIIRS [Nighttime Lights (NTL)]
  // ——————————————————————————————————————
  
  var NTLRaw = ee.ImageCollection('NASA/VIIRS/002/VNP46A2')
  
      .filterBounds(Domain)
      
      .filterDate( StartDt , EndDt )
      
      .select('Gap_Filled_DNB_BRDF_Corrected_NTL')
      
      .mean()
  
      .rename('NTL')
   
      .setDefaultProjection(NTLProjection)                              ;
  
      var NTL = IsCoarse ? NTLRaw : NTLRaw.resample( ResamplingMethod ) ;
    
  // ———————————————————————————————————
  // [6.1.4] WorldPop Population Density
  // ———————————————————————————————————

  var PopDensity = ee.Image([]).rename('PD') ;
  
  if ( PrecomputedPopDensity ) {
  
    PopDensity = PrecomputedPopDensity.unmask( 0 ).updateMask( ExactMask ) ;
  
  } else {

    // [7] Synchronously Fetch The Intersecting Country Names To a Client-Side JS Array

    var WBOBCountries = ee.FeatureCollection( Config.WBOB_ADM0 )

      .filterBounds( Domain )

      .aggregate_array( 'NAM_0' )

      .getInfo() ;

    // [8] Match WBOB Names To Registry Aliases To Fix UN-Style Country Names

    var RegistryAliases   = Config.CityRegistry[City].CountryAliases || [] ;

    var ResolvedCountries = [] ;

    WBOBCountries.forEach( function( WBOBCountry ) {

      var match = RegistryAliases.find( function( Alias ) {

        return WBOBCountry.toLowerCase().includes( Alias.toLowerCase() ) || Alias.toLowerCase().includes( WBOBCountry.toLowerCase() ) ;

      }) ;
      
      // Push The Alias If Matched, Otherwise Push The Raw WBOB Name

      ResolvedCountries.push( match || WBOBCountry ) ;

    }) ;

    // [9] Build The ImageCollection Using Pure Client-Side Strings

    var PDCol = ee.ImageCollection([]) ;
    
    ResolvedCountries.forEach( function( Country ) {

      var AssetPath = WorldPopFolder + '/' + Country + '/Spatial-Distribution/' + Year      ;

      PDCol         = PDCol.merge( ee.ImageCollection( AssetPath ).filterBounds( Domain ) ) ;

    }) ;
  
    // [10] Mosaic & Apply Mask

    PopDensity = PDCol

                 .filterBounds( Domain )

                 .mosaic()

                 .clip( Domain )

                 .rename( 'PD' )

                 .unmask( 0 )

                 .updateMask( ExactMask )

                 .setDefaultProjection( PDProjection ) ;

    PopDensity = IsCoarse ? PopDensity : PopDensity.resample( ResamplingMethod ) ;

  }

  var Stack = [ S1 , SpectralIndices , SpectralBands , NTL , PopDensity ] ;
  
  // ——————————————————————
  // [10.1] Static Features 
  // ——————————————————————
 
  if (!isDynamicOnly) {
    
    // ——————————————————————————————
    // [10.1.1] Topographic Variables
    // ——————————————————————————————
    
    var Topographic = TopographicFeatures(Domain).updateMask(ExactMask) ;

    // ————————————————————————————
    // [10.1.2] Urban 3D Morphology 
    // ————————————————————————————
  
    var Urban3D         = ee.Image([])                                                                             ;
  
    var AssetPath       = Config.AssetRoot + '/3D-UM/' + City + '/' + City + '-3D'                                 ;
   
    var MorphologyAsset = ee.Image(AssetPath).clip(Domain)                                                         ;
    
    var BuiltZero       = MorphologyAsset.select([ 'BH' , 'BCR' , 'SDH' , 'FAI' ]).unmask(0).updateMask(ExactMask) ;
  
    var SVFOpen         = MorphologyAsset.select('SVF').unmask(1).updateMask(ExactMask)                            ;
 
    Urban3D             = BuiltZero.addBands(SVFOpen).select([ 'BH' , 'SVF' , 'BCR' , 'SDH' , 'FAI' ])             ;
    
  // —————————————————————————————————————————
  // [10.1.3] Stacked Spatiotemporal Data Cube
  // —————————————————————————————————————————
  
   Stack.push(Topographic) ;
  
   Stack.push(Urban3D)     ; 
  
   }

  return ee.Image.cat(Stack).updateMask(ExactMask) ;
  
} ;

// ———————————————————————————
// [11] Spatial Texture (GLCM)
// ———————————————————————————

var GLCMSpec = {

  Bands   : [ 'VH' , 'VV' , 'B12' , 'B8' ]         ,

  Windows : [ 1 , 3 , 7 , 9 ]                      ,

  Metrics : [ 'var' , 'contrast' , 'idm' , 'ent' ] ,

  Levels  : 32

} ;

var GLCMQuantise = function( Band , BandName ) {

  var Range  = Config.GLCMRanges[BandName] ;

  var Min    = Range[0]                    ;

  var Max    = Range[1]                    ;

  return Band.subtract(Min).divide( Max - Min ).multiply( GLCMSpec.Levels - 1 ).round().clamp( 0 , GLCMSpec.Levels - 1 ).toByte() ;

} ;

var AddSpatialTextureExport = function( image ) {

  var TextureBands = GLCMSpec.Bands.map(function(Band) {

    return { Band : Band , Windows : GLCMSpec.Windows , Metrics : GLCMSpec.Metrics } ;

  }) ;

  var TextureImages = [] ;

  TextureBands.forEach(function(Item) {

    var BaseBand = image.select( Item.Band )            ;

    var ByteBand = GLCMQuantise( BaseBand , Item.Band ) ;

    var CRS10m   = image.select(0).projection()         ;

    Item.Windows.forEach(function(w) {

      var GLCM = ByteBand.reproject({ crs: CRS10m , scale: 10 }).glcmTexture({ size: w }) ;

      var GLCMBandNames = Item.Metrics.map(function(Metric) {

        return Item.Band + '_' + Metric;

      });

      var GLCMNames = Item.Metrics.map(function(Metric) {

        return Item.Band + '-' + Metric.toUpperCase() + '-' + w ;

      }) ;

      TextureImages.push(GLCM.select(GLCMBandNames).rename(GLCMNames)) ;

    }) ;

  }) ;

  var Combined = ee.Image.cat( TextureImages )            ;

  return Config.ScaleCube( Combined )                     ;

} ;

exports.GLCMSpec                = GLCMSpec                ;

exports.GLCMQuantise            = GLCMQuantise            ;

exports.AddSpatialTextureExport = AddSpatialTextureExport ;

// ———————————
// [1] Modules
// ———————————

var Config        = require('users/alirezaali/UC4D:01 Configurations') ;

var Visualization = Config.Visualization                               ;

var AssetRoot     = Config.AssetRoot                                   ;

// —————————————————
// [2] Configuration
// —————————————————

// [2.1] Assets

var Assets = {

  STC        : AssetRoot + '/STC'                      ,

  Domains    : AssetRoot + '/Spatial-Domains'          ,

  Stations   : AssetRoot + '/GHCNh/GHCNh-Station-List' ,

  LCZSamples : AssetRoot + '/Samples/LCZ'              ,

  DS         : AssetRoot + '/DS-ERA5'                  ,

  BC         : AssetRoot + '/BC-ERA5'
} ;

// [2.2] Palette

var Font   = 'Google Sans';

var Colors = {

  Bg          : '#ffffff'             ,

  Panel       : '#f6f8fa'             ,

  Border      : '#dadce0'             ,

  Text        : '#202124'             ,

  Muted       : '#5f6368'             ,

  Dark        : '#3c4043'             ,

  DarkTint    : '#e8eaed'             ,

  Blue        : '#1a73e8'             ,

  BlueTint    : '#e8f0fe'             ,

  Green       : '#188038'             ,

  GreenTint   : '#e6f4ea'             ,

  Orange      : '#e8710a'             ,

  OrangeTint  : '#fef7e0'             ,

  Disabled    : '#9aa0a6'             ,

  Black       : '#000000'             ,

  FlipIdle    : '#bdc1c6'             ,

  Grid        : '#f0f0f0'             ,

  Clear       : 'rgba(255,255,255,0)' ,

  MarkerRing  : '#ffffff'             ,

  MarkerFill  : '#5f6368'             ,

  LCZFallback : '#AAAAAA'             ,

  Stations    : 'red'

} ;

// [2.3] Time

var Years = [ 2020 , 2021 , 2022 , 2023 , 2024 , 2025 ] ;

// [2.4] Cities

var Cities = {

  Tehran : {

    seasons      : [ 'SPR' , 'SUM' , 'AUT' , 'WIN' ]                 ,

    seasonColors : [ '#3d7a45' , '#e8242c' , '#f5821f' , '#5262b5' ] ,

    center       : [ 51.389 , 35.689 ]                               ,

    zoom         : 10                                                ,

    width        : '66px'                                            ,

    accent       : Colors.Blue                                       ,

    tint         : Colors.BlueTint

  } ,

  Singapore : {

    seasons      : [ 'NEM' , 'IM1' , 'SWM' , 'IM2' ]                 ,

    seasonColors : [ '#5b9bd5' , '#f5a01a' , '#d6454f' , '#7b4aa6' ] ,

    center       : [ 103.82 , 1.352 ]                                ,

    zoom         : 11                                                ,

    width        : '84px'                                            ,

    accent       : Colors.Green                                      ,

    tint         : Colors.GreenTint

  }

} ;

// [2.5] Tiers

//   scaledInt  : Stored as Scaled Integers (Divided by The Layer Scale On Load)

//   Annual     : Yearly Only (No Seasons)

//   StaticFrom : Which Tier's Folder Holds the Static Asset

//   SampleScale: reduceRegion Scale (m) Used for Point Profiles

var Tiers = {

  FINP : { resolution: '10 m'  , width: '90px'  , scaledInt: true  , Annual: false , StaticFrom: 'FINP' , SampleScale: 30  } ,

  LCZP : { resolution: '10 m'  , width: '90px'  , scaledInt: true  , Annual: true  , StaticFrom: 'FINP' , SampleScale: 30  } ,

  CORP : { resolution: '1 km'  , width: '105px' , scaledInt: false , Annual: false , StaticFrom: 'CORP' , SampleScale: 200 }

} ;

// [2.5.1] ERA5 Override Mode

//   'Off' → Tier Drives The Map

//   'DS'  → Downscaled 10 m Climate (T2M / WS / SM / SR / RH)

//   'BC'  → Bias-Corrected 11 km Climate (T2M / WS / D2M)

//   'Raw' → Raw ERA5-Land Seasonal Mean (T2M / D2M / WS / RH / SR / SM)

var ERA5Modes     = [ 'DS' , 'BC' , 'Raw' ];

var ERA5Style      = { accent: Colors.Orange , tint: Colors.OrangeTint };

var ERA5TabsHolder = SegmentedHolder();

var ClimateLayers = {

  DS  : [ 'T2M' , 'WS' , 'SM' , 'SR' , 'RH' ] ,

  BC  : [ 'T2M' , 'WS' , 'D2M' ]              ,

  Raw : [ 'T2M' , 'D2M' , 'WS' , 'RH' , 'SR' , 'SM' ]

} ;

var ClimateLayerMeta = {

  T2M : { vis: 'T2MVisParams' , unit: '°C'    } ,

  WS  : { vis: 'WSVisParams'  , unit: 'm/s'   } ,

  SM  : { vis: 'SMVisParams'  , unit: 'm³/m³' } ,

  SR  : { vis: 'SRVisParams'  , unit: 'J/m²'  } ,

  RH  : { vis: 'RHVisParams'  , unit: '%'     } ,

  D2M : { vis: 'T2MVisParams' , unit: '°C'    }

} ;

// [2.6] Spatial Domains

var Domains       = [ 'Holdout' , 'SUHI' , 'Training' , 'LCZ' , 'Complete' , 'None' ] ;

var DomainNone   = 'None' ;

var DomainOpacity = 0.25   ;

var DomainColors  = {
  
  Holdout  : '#FF000040' ,
  
  SUHI     : '#FFA50040' ,
  
  Training : '#00008B40' ,
  
  LCZ      : '#8A2BE21A' ,
  
  Complete : '#00FF0022'

} ;

// [2.7] LCZ-TIRPs

var LCZ = {

  idProperty : 'LCZID' ,

  prefix     : 'LCZ'   ,

  min        : 1       ,

  max        : 17      ,

  letters    : { 'A' : 11 , 'B' : 12 , 'C' : 13 , 'D' : 14 , 'E' : 15 , 'F' : 16 , 'G' : 17 }

} ;

var LCZColors   = ee.List(Visualization.LCZPalette) ;

var LetterToNum = ee.Dictionary(LCZ.letters)        ;

// [2.8] Basemap (Sentinel-2 RGB Median)

var Basemap = {

  collection : 'COPERNICUS/S2_SR_HARMONIZED' ,

  label      : 'S2 SR Harmonized'            ,

  start      : '2025-01-01'                  ,

  end        : '2025-12-30'                  ,

  maxCloud   : 5                             ,

  bands      : [ 'B4' , 'B3' , 'B2' ]        ,

  vis        : { min: 200 , max: 2800 , gamma: 1.2 }

} ;

// [2.9] Startup Defaults

var Defaults = {

  city         : 'Tehran' ,

  tier         : 'FINP'   ,

  ERA5         : 'Off'    ,

  year         : 2024     ,

  layer        : 'NDVI'   ,

  domain       : 'None'   ,

  opacity      : 1.0      ,

  toolbarAtTop : true

} ;

var OpacitySteps = [ 100 , 90 , 80 , 70 , 60 , 50 , 40 , 30 , 20 , 10 ];

// [2.10] Info Content

var Info = {

  Title    : 'UC4D Explorer'                                                                                            ,

  Citation : 'Rezaali & Pilehforooshha (2026)'                                                                          ,

  DataDOI  : '10.5281/zenodo.22723885'                                                                                  ,

  CodeDOI  : '10.5281/zenodo.22865045'                                                                                  ,

  About    : 'An interactive explorer to visualize multi-scale, multi-source spatiotemporal data for urban climate research. The cube integrates SAR, optical, atmospheric, and 3D morphology layers at 10 m and ~1 km resolutions.' ,

  Inside   : 'SAR, Spectral Indices, Surface Physics, Optical, Topography, 3D Morphology, Nighttime Lights, Population, Climate' ,

  Overlays : 'Overlays: Spatial Domains, GHCN-h Stations, LCZ Reference Polygons'                                                ,

  Footer   : 'Please cite the Data and Code DOIs along with the paper when you use them. Built on Google Earth Engine.'

} ;

// [2.11] Map, Chart & Layout Constants

var FallbackVis       = { min : 0 , max : 1 , palette : [ 'black' , 'white' ] }                                   ;

var MarkerStyle       = { color : Colors.MarkerRing , fillColor : Colors.MarkerFill , pointSize : 7 , width : 2 } ;

var ProfileMaxPixels = 1e9                                                                                       ;

var BtnMinW          = 64                                                                                        ;

var Layout             = {

  Top    : { position: 'top-left'    , margin: '8px 0 0 8px'  } ,

  Bottom : { position: 'bottom-left' , margin: '0 0 22px 8px' }

} ;

var Sizes = {

  ChartPanel  : '450px'     ,

  ChartTitle  : '372px'     ,

  ChartHeight : '240px'     ,

  InfoCard    : '342px'     ,

  InfoText    : '316px'     ,

  LegendBox   : '0,0,100,8' ,

  LegendPx    : '90x10'

} ;

var MinimalGrey = [

  { elementType: 'geometry' , stylers: [ { color: '#212121' } ] }                            ,

  { elementType: 'labels' , stylers: [ { visibility: 'off' } ] }                             ,

  { featureType: 'administrative' , stylers: [ { visibility: 'off' } ] }                     ,

  { featureType: 'poi' , stylers: [ { visibility: 'off' } ] }                                ,

  { featureType: 'road' , elementType: 'geometry.fill' , stylers: [ { color: '#2c2c2c' } ] } ,

  { featureType: 'road' , elementType: 'labels' , stylers: [ { visibility: 'off' } ] }       ,

  { featureType: 'water' , elementType: 'geometry' , stylers: [ { color: '#000000' } ] }

] ;

var MapTypeName = 'Dark Grey';

// —————————————————
// [3] Layer Catalog
// —————————————————

var Layer = function(Id , Source , Scale , Unit , VisKey) {

  return { id: Id , label: Id , source: Source , scale: Scale , unit: Unit , vis: VisKey || (Id + 'Vis') } ;

} ;

var LayerCatalog = [

  // SAR

  Layer( 'VV'   , 'dynamic' , 100 , 'dB'          ) ,

  Layer( 'VH'   , 'dynamic' , 100 , 'dB'          ) ,

  Layer( 'Diff' , 'dynamic' , 100 , 'dB'          ) ,

  // Spectral Indices

  Layer( 'NDVI'   , 'dynamic' , 10000 , 'Unitless'    ) ,

  Layer( 'MSAVI2' , 'dynamic' , 10000 , 'Unitless'    ) ,

  Layer( 'EVI2'   , 'dynamic' , 10000 , 'Unitless'    ) ,

  Layer( 'NDRE'   , 'dynamic' , 10000 , 'Unitless'    ) ,

  Layer( 'NDMI'   , 'dynamic' , 10000 , 'Unitless'    ) ,

  Layer( 'NDWI'   , 'dynamic' , 10000 , 'Unitless'    ) ,

  Layer( 'MNDWI'  , 'dynamic' , 10000 , 'Unitless'    ) ,

  Layer( 'BSI'    , 'dynamic' , 10000 , 'Unitless'    ) ,

  Layer( 'BLFEI'  , 'dynamic' , 10000 , 'Unitless'    ) ,

  // Surface Physics

  Layer( 'Albedo'     , 'dynamic' , 10000 , 'Unitless'    ) ,

  Layer( 'FVC'        , 'dynamic' , 10000 , 'Fraction'    ) ,

  Layer( 'Emissivity' , 'dynamic' , 10000 , 'Unitless'    ) ,

  // Optical

  Layer( 'B1'  , 'dynamic' , 1 , 'DN'          ) ,

  Layer( 'B2'  , 'dynamic' , 1 , 'DN'          ) ,

  Layer( 'B3'  , 'dynamic' , 1 , 'DN'          ) ,

  Layer( 'B4'  , 'dynamic' , 1 , 'DN'          ) ,

  Layer( 'B5'  , 'dynamic' , 1 , 'DN'          ) ,

  Layer( 'B6'  , 'dynamic' , 1 , 'DN'          ) ,

  Layer( 'B7'  , 'dynamic' , 1 , 'DN'          ) ,

  Layer( 'B8'  , 'dynamic' , 1 , 'DN'          ) ,

  Layer( 'B8A' , 'dynamic' , 1 , 'DN'          ) ,

  Layer( 'B9'  , 'dynamic' , 1 , 'DN'          ) ,

  Layer( 'B11' , 'dynamic' , 1 , 'DN'          ) ,

  Layer( 'B12' , 'dynamic' , 1 , 'DN'          ) ,
  
  // Topography

  Layer( 'Elevation' , 'static' , 100   , 'm'           ) ,

  Layer( 'Slope'     , 'static' , 100   , 'Degrees'     ) ,

  Layer( 'Northness' , 'static' , 10000 , 'Unitless'    ) ,

  Layer( 'Eastness'  , 'static' , 10000 , 'Unitless'    ) ,

  // 3D Morphology

  Layer( 'BH'  , 'static' , 100   , 'm'           ) ,

  Layer( 'SVF' , 'static' , 10000 , 'Unitless'    ) ,

  Layer( 'BCR' , 'static' , 10000 , 'Fraction'    ) ,

  Layer( 'SDH' , 'static' , 100   , 'm'           ) ,

  Layer( 'FAI' , 'static' , 10000 , 'Unitless'    ) ,

  // Anthropogenic

  Layer( 'NTL' , 'dynamic' , 100 , 'nW·cm⁻²·sr⁻¹') ,

  Layer( 'PD'  , 'dynamic' , 100 , 'People/Cell' )

] ;

// [3.1] GLCM Texture Layers

var GLCMetricVis    = { 'VAR' : 'GLCMVarVis' , 'CONTRAST' : 'GLCMContrastVis' , 'IDM' : 'GLCMIDMVis' , 'ENT' : 'GLCMEntVis' } ;

var GLCMetricScales = { 'VAR' : 10 , 'CONTRAST' : 10 , 'IDM' : 10000 , 'ENT' : 1000 }                                         ;

[ 'VH' , 'VV' , 'B12' , 'B8' ].forEach(function(Band) {

  [ 'VAR' , 'CONTRAST' , 'IDM' , 'ENT' ].forEach(function(Metric) {

    [ 1 , 3 , 7 , 9 ].forEach(function(Window) {

      LayerCatalog.push(

        Layer( Band + '-' + Metric + '-' + Window , 'GLCM' , GLCMetricScales[Metric] , 'Unitless' , GLCMetricVis[Metric] )

      ) ;

    }) ;

  }) ;

}) ;

var LayerById = {};

LayerCatalog.forEach(function(L) { LayerById[L.id] = L ; }) ;

function LayerAvailable(Lyr , Tier) {

  if (Lyr.source === 'GLCM') return Tiers[Tier].Annual ;

  return true ;

}

// —————————
// [4] State
// —————————

var state = {

  city    : Defaults.city                    ,

  tier    : Defaults.tier                    ,

  ERA5    : Defaults.ERA5                    ,

  year    : Defaults.year                    ,

  season  : Cities[Defaults.city].seasons[0] ,

  layer   : Defaults.layer                   ,

  domain  : Defaults.domain                  ,

  opacity : Defaults.opacity

} ;

var ToolbarAtTop = Defaults.toolbarAtTop ;

var CityNames    = Object.keys(Cities)   ;

var TierNames    = Object.keys(Tiers)    ;

function TierLabel(Tier) { return Tier + ' · ' + Tiers[Tier].resolution ; }

// —————————————————————
// [5] Vis Params Lookup
// —————————————————————

function FallbackVis() {

  return { min: FallbackVis.min , max: FallbackVis.max , palette: FallbackVis.palette , opacity: state.opacity } ;

}

function GetVisParams(LayerId) {

  var VisKey = null;

  if (state.ERA5 !== 'Off') {

    var Meta = ClimateLayerMeta[LayerId] ;

    if (Meta) VisKey = Meta.vis ;

  } else {

    var Lyr = LayerById[LayerId] ;

    if (Lyr) VisKey = Lyr.vis ;

  }

  if (!VisKey) return FallbackVis() ;

  var Vp = Visualization[VisKey];

  if (!Vp) {

    print('Missing Visualization Module Export: ' + VisKey) ;

    return FallbackVis() ;

  }

  var MinVal = (Vp.min !== undefined) ? Vp.min : Vp.vmin ;

  var MaxVal = (Vp.max !== undefined) ? Vp.max : Vp.vmax ;

  return {

    min     : MinVal     ,

    max     : MaxVal     ,

    palette : Vp.palette ,

    opacity : state.opacity

  } ;

}

// —————————————————
// [6] Asset Loaders
// —————————————————

function DynamicAssetPath(city , tier , season , year) {

  if (Tiers[tier].Annual) return Assets.STC + '/' + tier + '/' + city + '/' + city + '-' + year ;

  return Assets.STC + '/' + tier + '/' + city + '/Dynamic/' + city + '-' + season + '-' + year ;

}

function GLCMAssetPath(city , tier , year) {

  return Assets.STC + '/' + tier + '/' + city + '/' + city + '-' + year + '-GLCM' ;

}

function StaticAssetPath(city , tier) {

  return Assets.STC + '/' + Tiers[tier].StaticFrom + '/' + city + '/Static/' + city ;

}

function SeasonLabelOf(city , season , year) {

  return season + '-' + year ;

}

function SeasonDatesOf(city , season , year) {

  var Label = SeasonLabelOf(city , season , year) ;

  var List  = Config[city + 'Seasons'] || []      ;

  for (var i = 0 ; i < List.length ; i++) {

    if (List[i].label === Label) return { start: List[i].start , end: List[i].end } ;

  }

  return null ;

}

function LoadClimateImage(city , mode , band , season , year) {

  var Label = SeasonLabelOf(city , season , year);

  if (mode === 'DS') {

    return ee.Image(Assets.DS + '/' + city + '/' + city + '-' + Label).select(band) ;

  }

  if (mode === 'BC') {

    var BC = ee.Image(Assets.BC + '/' + city + '/' + city + '-' + Label);

    return BC.select([ 'd.*_' + band ]).reduce(ee.Reducer.mean()).rename(band) ;

  }

  if (mode === 'Raw') {

    var Dates = SeasonDatesOf(city , season , year);

    if (!Dates) return null ;

    var Start = ee.Date(Dates.start);

    var End   = ee.Date(Dates.end).advance(1 , 'day');

    var Coll  = ee.ImageCollection('ECMWF/ERA5_LAND/HOURLY')

      .filterDate(Start , End)

      .select([ 

        'temperature_2m'                           ,

        'dewpoint_temperature_2m'                  ,

        'u_component_of_wind_10m'                  ,

        'v_component_of_wind_10m'                  ,

        'surface_solar_radiation_downwards_hourly' ,

        'volumetric_soil_water_layer_1'

      ]) ;

    var Mean = Coll.mean()                                                            ;

    var T2M  = Mean.select('temperature_2m').subtract(273.15).rename('T2M')           ;

    var D2M  = Mean.select('dewpoint_temperature_2m').subtract(273.15).rename('D2M')  ;

    var U    = Mean.select('u_component_of_wind_10m')                                 ;

    var V    = Mean.select('v_component_of_wind_10m')                                 ;

    var WS   = U.pow(2).add(V.pow(2)).sqrt().rename('WS')                             ;

    var Num  = ee.Image(17.625).multiply(D2M).divide(ee.Image(243.04).add(D2M)).exp() ;

    var Den  = ee.Image(17.625).multiply(T2M).divide(ee.Image(243.04).add(T2M)).exp() ;

    var RH   = ee.Image(100).multiply(Num.divide(Den)).clamp(0 , 100).rename('RH')    ;

    var SR   = Mean.select('surface_solar_radiation_downwards_hourly').rename('SR')   ;

    var SM   = Mean.select('volumetric_soil_water_layer_1').rename('SM')              ;

    return ee.Image.cat([ T2M , D2M , WS , RH , SR , SM ]).select(band)               ;

  }

  return null ;

}

function LoadLayerImage(city , tier , layerId , season , year) {

  if (state.ERA5 !== 'Off') return LoadClimateImage(city , state.ERA5 , layerId , season , year) ;

  var Lyr = LayerById[layerId];

  if (!Lyr) return null ;

  var Src ;

  if (Lyr.source === 'static') {

    Src = StaticAssetPath(city , tier);

  } else if (Lyr.source === 'GLCM') {

    if (!Tiers[tier].Annual) return null ;

    Src = GLCMAssetPath(city , tier , year);

  } else {

    Src = DynamicAssetPath(city , tier , season , year);

  }

  var Img = ee.Image(Src).select(Lyr.id) ;

  if (Tiers[tier].scaledInt && Lyr.scale !== 1) Img = Img.toFloat().divide(Lyr.scale) ;

  return Img ;

}

function LoadDomain(city , type) {

  return ee.FeatureCollection(Assets.Domains + '/' + type + '-Domain/' + city ) ;

}

// GHCN-h Stations (Global)

var StationsTable        = ee.FeatureCollection(Assets.Stations);

var StationsWithGeometry = StationsTable.map(function(Feature) {

  var Lon = Feature.getNumber('LONGITUDE') ;

  var Lat = Feature.getNumber('LATITUDE')  ;

  return Feature.setGeometry(ee.Geometry.Point([ Lon , Lat ])) ;

}) ;

// LCZ Samples (TIRPs toggle)

function StyleByLCZ(FC) {

  return FC.map(function(Feat) {

    var Raw        = ee.String(Feat.get(LCZ.idProperty));

    var Code       = Raw.replace(LCZ.prefix , '').replace(' ' , '' , 'g').trim();

    var Num        = ee.Number.parse(Code);

    var IsLetter   = ee.Number(LetterToNum.contains(Code));

    var IsNumValid = ee.Number(Num.gte(LCZ.min).and(Num.lte(LCZ.max)));

    var ClassNum   = ee.Algorithms.If(IsLetter , LetterToNum.get(Code) , ee.Algorithms.If(IsNumValid , Num , 0));

    ClassNum       = ee.Number(ClassNum).int();

    var Color      = ee.String(ee.Algorithms.If(ClassNum.gte(LCZ.min).and(ClassNum.lte(LCZ.max)) ,

                                                LCZColors.get(ClassNum.subtract(1)) , Colors.LCZFallback))               ;

    return Feat.set('style' , { color: Color , fillColor: Color , width: 1 }) ;

  }) ;

}

function LoadLCZSamples(city) {

  var FC = ee.FeatureCollection(Assets.LCZSamples + '/' + city ) ;

  return StyleByLCZ(FC).style({ styleProperty: 'style' })  ;

}

// ——————————————
// [7] UI Helpers
// ——————————————

var DefaultStyle = { accent: Colors.Blue , tint: Colors.BlueTint } ;

var TierStyle    = { accent: Colors.Dark , tint: Colors.DarkTint } ;

var Typo         = {

    Title : { fontFamily: Font , fontSize: '15px' , fontWeight: '600' , color: Colors.Text , margin : '0' , stretch: 'horizontal' , textAlign: 'center' } ,
  
    Caption : { fontFamily: Font , fontSize: '10px' , fontWeight: '600' , color: Colors.Muted , margin : '0 0 4px 0' , stretch: 'horizontal' , textAlign: 'center' } ,
  
    Small : { fontFamily: Font , fontSize: '10px' , color: Colors.Muted , margin: '0' }

} ;

function GlyphLabel(Glyph , Width , FontPx) {

  var N   = Math.max(0 , Math.round((BtnMinW - Width) / (0.25 * FontPx))) ;

  var Pad = ''                                                              ;

  for (var i = 0 ; i < N ; i++) Pad += '\u00A0' ;

  return Glyph + Pad ;

}

function TabButton(Label , Active , OnClick , Width , Look , NoMarker) {

  var L = Look || DefaultStyle;

  return ui.Button({

    label   : (Active && !NoMarker) ? '● ' + Label : Label ,

    onClick : OnClick                                      ,

    style   : {

      fontFamily      : Font                                              ,

      fontSize        : '11px'                                            ,

      fontWeight      : Active ? '600' : '400'                            ,

      color           : Active ? L.accent : Colors.Text                   ,

      backgroundColor : Active ? L.tint : Colors.Panel                    ,

      border          : '1px solid ' + (Active ? L.accent : Colors.Panel) ,

      borderRadius    : '6px'                                             ,

      margin          : '0 2px 0 0'                                       ,

      padding         : '0'                                               ,

      width           : Width || '90px'

    }

  }) ;

}

function Group(Caption , Widget , RightMargin , Width) {

  var St              = { margin: '0 ' + (RightMargin === undefined ? 18 : RightMargin) + 'px 0 0' , backgroundColor: Colors.Bg } ;

  if (Width) St.width = Width                                                                                                     ;

  return ui.Panel({

    widgets : [ ui.Label({ value: Caption , style: Typo.Caption }) , Widget ] ,

    layout  : ui.Panel.Layout.flow('vertical')                                ,

    style   : St

  }) ;

}

function SegmentedHolder() {

  return ui.Panel({

    layout : ui.Panel.Layout.flow('horizontal') ,

    style  : {

      margin          : '0'                          ,

      padding         : '2px'                        ,

      backgroundColor : Colors.Panel                 ,

      border          : '1px solid ' + Colors.Border ,

      borderRadius    : '10px'

    }

  }) ;

}

function SelectHolder(Widget) {

  var H = SegmentedHolder();

  H.add(Widget) ;

  return H ;

}

function StyledSelect(Items , Value , Width , OnChange , Margin) {

  return ui.Select({

    items    : Items                                                                                               ,

    value    : Value                                                                                               ,

    style    : { fontFamily: Font , color: Colors.Text , width: Width , fontSize: '11px' , borderRadius: '8px' , margin: Margin || '0' } ,
    
    onChange : OnChange

  }) ;

}

function GetTemporalMode(Lyr , Tier) {

  if (state.ERA5 !== 'Off') return 'seasonal' ;

  if (String(Lyr.source || '').toLowerCase() === 'static') return 'static' ;

  if (Tiers[Tier].Annual) return 'Annual' ;

  return 'seasonal' ;

}

function FormatNum(V) {

  if (typeof V !== 'number') return String(V) ;

  if (V === 0)               return '0' ;

  if (Math.abs(V) < 0.01)    return V.toExponential(2) ;

  if (Math.abs(V) < 10)      return V.toFixed(2) ;

  return String(Math.round(V)) ;

}

function FormatValue(V) {

  if (typeof V !== 'number') return String(V) ;

  if (V === 0)               return '0' ;

  if (Math.abs(V) < 0.001)   return V.toExponential(2) ;

  if (Math.abs(V) < 100)     return V.toFixed(3) ;

  return V.toFixed(1) ;

}

// ———————————————————————————————
// [7.1] Floating Cards On The Map
// ———————————————————————————————

var ChartTitle = ui.Label({

  value : ''                                                                             ,

  style : { fontFamily: Font , fontSize: '12px' , fontWeight: '600' , color: Colors.Text ,

            margin : '6px 8px 0 0' , stretch: 'horizontal' }

}) ;

var ChartSub = ui.Label({

  value : '' ,

  style : { fontFamily: Font , fontSize: '10px' , color: Colors.Muted , margin: '0' }

}) ;

var ChartClose = ui.Button({

  imageUrl : IconUrl('close' , 20) ,

  onClick  : function() { ChartPanel.style().set('shown' , false) ; } ,

  style    : {

    backgroundColor : Colors.Clear ,

    borderStyle     : 'none'      ,

    borderWidth     : '0px'      ,

    margin          : '2px 0 0 0' ,

    padding         : '0'

  }

}) ;

var ChartHolder = ui.Panel({ style: { margin: '6px 0 0 0' , stretch: 'horizontal' }});

var ChartPanel  = ui.Panel({

  widgets : [

    ui.Panel({

      widgets : [ ChartTitle , ChartClose ]        ,

      layout  : ui.Panel.Layout.flow('horizontal') ,

      style   : { margin: '0' , backgroundColor: Colors.Clear }

    }) ,

    ChartSub    ,

    ChartHolder

  ] ,

  style : {

    width           : Sizes.ChartPanel             ,

    padding         : '8px 14px 12px 14px'         ,

    margin          : '0 0 6px 0'                  ,

    backgroundColor : Colors.Bg                    ,

    border          : '1px solid ' + Colors.Border ,

    borderRadius    : '10px'                       ,

    shown           : false

  }

}) ;

var ViewSummary = ui.Label({

  value : ''                                                                             ,

  style : { fontFamily: Font , fontSize: '12px' , fontWeight: '600' , color: Colors.Text ,

            margin : '0' , stretch: 'horizontal' , textAlign: 'center' }

}) ;

var ViewHint = ui.Label({

  value : ''                                                         ,

  style : { fontFamily: Font , fontSize: '10px' , color: Colors.Text ,

            margin : '4px 0 0 0' , stretch: 'horizontal' , textAlign: 'center' }

}) ;

var ViewSnippet = ui.Label({

  value : ''                                                         ,

  style : { fontFamily: Font , fontSize: '9px' , color: Colors.Muted ,

            margin : '4px 0 0 0' , stretch: 'horizontal' , textAlign: 'center' }

}) ;

var ViewCard = ui.Panel({

  widgets : [ ViewSummary , ViewHint , ViewSnippet ] ,

  style   : {

    position        : 'top-center'                 ,

    padding         : '10px 14px 12px 14px'        ,

    backgroundColor : Colors.Bg                    ,

    border          : '1px solid ' + Colors.Border ,

    borderRadius    : '10px'

  }

}) ;

var InfoOpen = false;

function InfoText(Value , Size , Weight , Color , Margin , Url) {

  var St = {

    fontFamily : Font            ,

    fontSize   : Size            ,

    fontWeight : Weight || '400' ,

    color      : Color           ,

    margin     : Margin          ,

    width      : Sizes.InfoText  ,

    whiteSpace : 'normal'

  } ;

  return Url ? ui.Label(Value , St , Url) : ui.Label(Value , St) ;

}

var InfoCities  = CityNames.length + ' cities';

var InfoYears   = Years[0] + '–' + Years[Years.length - 1];

var InfoSeasons = Cities[CityNames[0]].seasons.length + ' Seasons a Year';

var InfoTiers   = 'Tiers: ' + TierNames.map(function(T) {

  return T + ' ' + Tiers[T].resolution + (Tiers[T].Annual ? ' (Annual)' : '') ;

}).join(' · ') ;

var InfoBasemap  = 'Sentinel-2 RGB: ' + Basemap.start.slice(0 , 4) + ' Median Composite';

var InfoBaseSub  = Basemap.label + ' · ' + Basemap.start + ' to ' + Basemap.end + ' · cloud < ' + Basemap.maxCloud + ' %';

var InfoContents = LayerCatalog.length + ' layers · ' + InfoCities + ' · ' + InfoYears + ' · ' + InfoSeasons;

var InfoBody     = ui.Panel({

  widgets : [

    InfoText( Info.Title                         , '14px' , '600' , Colors.Text  , '0'             ) ,

    InfoText( Info.Citation                      , '10px' , '400' , Colors.Muted , '2px 0 10px 0'  ) ,

    InfoText( 'ABOUT'                            , '9px'  , '600' , Colors.Muted , '0 0 3px 0'     ) ,

    InfoText( Info.About                         , '10px' , '400' , Colors.Text  , '0 0 10px 0'    ) ,

    InfoText( 'INSIDE THE CUBE'                  , '9px'  , '600' , Colors.Muted , '0 0 3px 0'     ) ,

    InfoText( InfoContents                       , '10px' , '400' , Colors.Text  , '0 0 2px 0'     ) ,

    InfoText( InfoTiers                          , '10px' , '400' , Colors.Text  , '0 0 2px 0'     ) ,

    InfoText( Info.Inside                        , '10px' , '400' , Colors.Text  , '0 0 2px 0'     ) ,

    InfoText( Info.Overlays                      , '10px' , '400' , Colors.Text  , '0 0 10px 0'    ) ,

    InfoText( 'DATA & CODE'                      , '9px'  , '600' , Colors.Muted , '0 0 3px 0'     ) ,

    InfoText( 'Data  ·  doi.org/' + Info.DataDOI , '10px' , '600' , Colors.Blue  , '0 0 2px 0'       , 'https://doi.org/' + Info.DataDOI ) ,

    InfoText( 'Code  ·  doi.org/' + Info.CodeDOI , '10px' , '600' , Colors.Blue  , '0 0 10px 0'      , 'https://doi.org/' + Info.CodeDOI ) ,

    InfoText( 'BASEMAP'                          , '9px'  , '600' , Colors.Muted , '0 0 3px 0'     ) ,

    InfoText( InfoBasemap                        , '10px' , '400' , Colors.Text  , '0 0 1px 0'     ) ,

    InfoText( InfoBaseSub                        , '10px' , '400' , Colors.Muted , '0 0 10px 0'    ) ,

    InfoText( Info.Footer                        , '9px'  , '400' , Colors.Muted , '0'             )

  ] ,

  style : {
 
    width           : Sizes.InfoCard               ,

    padding         : '10px 12px 12px 12px'        ,

    margin          : '0 0 6px 0'                  ,

    backgroundColor : Colors.Bg                    ,

    border          : '1px solid ' + Colors.Border ,

    borderRadius    : '10px'                       ,

    shown           : false

  }

}) ;

var InfoButton = ui.Button({

  imageUrl : IconUrl('info' , 20) ,

  onClick  : function() {

    InfoOpen = !InfoOpen;

    InfoBody.style().set('shown' , InfoOpen) ;

  } ,

  style : {

    backgroundColor : Colors.Bg      ,

    borderRadius    : '6px'          ,

    borderStyle     : 'none'         ,

    borderWidth     : '0px'          ,

    margin          : '2px 10px 0 0' ,

    padding         : '2px'

  }
}) ;

var LegendCard = ui.Panel({

  layout : ui.Panel.Layout.flow('horizontal') ,

  style  : {

    margin          : '0'                          ,

    padding         : '4px 10px 6px 10px'          ,

    backgroundColor : Colors.Bg                    ,

    border          : '1px solid ' + Colors.Border ,

    borderRadius    : '10px'

  }

}) ;

var InfoRow = ui.Panel({

  widgets : [ InfoButton , LegendCard ]        ,

  layout  : ui.Panel.Layout.flow('horizontal') ,

  style   : { margin: '0' , padding: '0' , backgroundColor: Colors.Clear }

}) ;

var LeftStack = ui.Panel({

  layout : ui.Panel.Layout.flow('vertical') ,

  style  : { position: Layout.Bottom.position , padding: '0' , margin: Layout.Bottom.margin , backgroundColor: Colors.Clear }

}) ;

// ———————————
// [8] Toolbar
// ———————————

var CityTabsHolder     = SegmentedHolder() ;

var TierTabsHolder     = SegmentedHolder() ;

var ERA5TabsHolder     = SegmentedHolder() ;

var StationsTabsHolder = SegmentedHolder() ;

var TIRPsTabsHolder    = SegmentedHolder() ;

var S2TabsHolder       = SegmentedHolder() ;

var YearSelect         = StyledSelect(

  Years.map(function(Y) { return { label: String(Y) , value: Y } ; }) , state.year , '64px' ,

  function(V) { state.year = V ; OnTimeChange() ; }

) ;

function MakeSeasonSelect() {

  if (Tiers[state.tier].Annual && state.ERA5 === 'Off') {

    return ui.Panel({

      widgets : [ ui.Label('Annual' , {

        fontFamily      : Font            ,

        fontSize        : '11px'          ,

        color           : Colors.Disabled ,

        margin          : '6px 0'         ,

        stretch         : 'horizontal'    ,

        textAlign       : 'center'        ,

        backgroundColor : Colors.Clear

      }) ] ,

      style : {

        width           : '66px'                       ,

        margin          : '0 4px 0 0'                  ,

        padding         : '0'                          ,

        backgroundColor : Colors.DarkTint              ,

        border          : '1px solid ' + Colors.Border ,

        borderRadius    : '6px'

      }

    }) ;

  }

  var Seasons = Cities[state.city].seasons ;

  if (Seasons.indexOf(state.season) === -1) state.season = Seasons[0] ;

  return StyledSelect(

    Seasons.map(function(S) { return { label: S , value: S } ; }) , state.season , '66px' ,

    function(V) { state.season = V ; OnTimeChange() ; } ,

    '0 4px 0 0'

  ) ;

}

var TimeHolder = SegmentedHolder() ;

TimeHolder.add(MakeSeasonSelect()) ;

TimeHolder.add(YearSelect)         ;

function MakeLayerSelect() {

  if (state.ERA5 !== 'Off') {

    var ClimateIds = ClimateLayers[state.ERA5] ;

    if (ClimateIds.indexOf(state.layer) === -1) state.layer = ClimateIds[0] ;

    return StyledSelect(

      ClimateIds.map(function(Id) { return { label: Id , value: Id } ; }) , state.layer , '140px' ,

      function(V) { state.layer = V ; OnLayerChange() ; }

    ) ;

  }

  var Available = LayerCatalog.filter(function(L) { return LayerAvailable(L , state.tier) ; }) ;

  var Ids = Available.map(function(L) { return L.id ; }) ;

  if (Ids.indexOf(state.layer) === -1) state.layer = Defaults.layer ;

  return StyledSelect(

    Available.map(function(L) { return { label: L.label , value: L.id } ; }) , state.layer , '140px' ,

    function(V) { state.layer = V ; OnLayerChange() ; }

  ) ;

}

var LayerHolder = SelectHolder(MakeLayerSelect()) ;

function RefreshLayerSelect() {

  LayerHolder.clear() ;

  LayerHolder.add(MakeLayerSelect()) ;

}

var DomainSelect = StyledSelect(

  Domains , state.domain , '96px' ,

  function(V) { state.domain = V ; ApplyDomain() ; }

) ;

var DomainHolder = SelectHolder(DomainSelect);

var FlipBox      = ui.Panel({

  layout : ui.Panel.Layout.flow('vertical') ,

  style  : { margin: '0 26px 0 0' , padding: '0' , backgroundColor: Colors.Bg }

}) ;

function IconUrl(Name , Size) {

  return 'https://fonts.gstatic.com/s/i/short-term/release/materialsymbolsrounded/' +

         Name + '/default/' + (Size || 20) + 'px.svg' ;

}

function MakeFlipButton(GoTop) {

  var On = (ToolbarAtTop === GoTop);

  return ui.Button({

    imageUrl : IconUrl(GoTop ? 'keyboard_arrow_up' : 'keyboard_arrow_down' , 20) ,

    onClick  : function() {

      if (ToolbarAtTop === GoTop) return ;

      ToolbarAtTop = GoTop;

      ApplyLayout() ;

    } ,

    disabled : On ,

    style    : { margin: '0 0 5px 0' , padding: '0' }

  }) ;

}

function RefreshFlip() {

  FlipBox.clear() ;

  FlipBox.add(MakeFlipButton(true))  ;

  FlipBox.add(MakeFlipButton(false)) ;

}


var Row = ui.Panel({

  widgets : [

    FlipBox ,

    Group( 'CITY'     , CityTabsHolder      ) ,

    Group( 'TIER'     , TierTabsHolder      ) ,

    Group( 'ERA5-Land', ERA5TabsHolder      ) ,

    Group( 'TIME'     , TimeHolder          ) ,

    Group( 'LAYER'    , LayerHolder         ) ,

    Group( 'DOMAIN'   , DomainHolder        ) ,

    Group( 'STATIONS' , StationsTabsHolder  ) ,

    Group( 'TIRPs'    , TIRPsTabsHolder     ) ,

    Group( 'BASEMAP'  , S2TabsHolder    , 0 )

  ] ,

  layout : ui.Panel.Layout.flow('horizontal') ,

  style  : { margin: '0' }

}) ;

var ToolbarPanel = ui.Panel({

  widgets : [ Row ]                          ,

  layout  : ui.Panel.Layout.flow('vertical') ,

  style   : {

    fontFamily      : Font                  ,

    width           : '100%'                ,

    padding         : '14px 18px 16px 18px' ,

    backgroundColor : Colors.Bg             ,

    border          : '1px solid ' + Colors.Border

  }

}) ;

// ————————————————————————————
// [9] Map Widget + Control Row
// ————————————————————————————

var S2Median = ee.ImageCollection(Basemap.collection)

  .filterDate(Basemap.start , Basemap.end)

  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE' , Basemap.maxCloud))

  .median()

  .select(Basemap.bands) ;

var MapWidget = ui.Map() ;

var MapTypes = {} ;

MapTypes[MapTypeName] = MinimalGrey ;

MapWidget.setOptions('ROADMAP' , MapTypes , [ 'ROADMAP' , 'SATELLITE' , MapTypeName ]) ;

MapWidget.setControlVisibility({ layerList: true , zoomControl: true , scaleControl: true , mapTypeControl: true }) ;

var MapArea = ui.Panel({

  layout  : ui.Panel.Layout.flow('vertical') ,

  widgets : [ MapWidget ]                    ,

  style   : { stretch: 'both' }

}) ;

// Runtime Handles

var DataLayer     = null  ;

var S2Layer       = null  ;

var StationsLayer = null  ;

var MarkerLayer   = null  ;

var TIRPsLayer    = null  ;

var DomainLayer   = null  ;

var LastPoint     = null  ;

var S2On          = false ;

var StationsShown = false ;

var TIRPsOn       = false ;

var ProfileToken  = 0     ;

var LastView      = {

  Lon  : Cities[state.city].center[0] ,

  Lat  : Cities[state.city].center[1] ,

  Zoom : Cities[state.city].zoom

} ;

MapWidget.onChangeCenter(function(C) { LastView.Lon = C.lon ; LastView.Lat = C.lat ; }) ;

MapWidget.onChangeZoom(function(Z)   { LastView.Zoom = Z ; })                           ;

function ApplyView(V) { MapWidget.setCenter(V.Lon , V.Lat , V.Zoom) ; }

MapWidget.add(LeftStack) ;

MapWidget.add(ViewCard)  ;

function ApplyLayout() {

  ui.root.clear() ;

  ui.root.setLayout(ui.Panel.Layout.flow('vertical')) ;

  LeftStack.clear() ;

  if (ToolbarAtTop) {

    ui.root.add(ToolbarPanel) ;

    ui.root.add(MapArea)      ;

    LeftStack.add(ChartPanel) ;

    LeftStack.add(InfoBody)   ;

    LeftStack.add(InfoRow)    ;

    LeftStack.style().set(Layout.Bottom) ;

  } else {

    ui.root.add(MapArea)      ;

    ui.root.add(ToolbarPanel) ;

    LeftStack.add(ChartPanel) ;

    LeftStack.add(InfoBody)   ;

    LeftStack.add(InfoRow)    ;

    LeftStack.style().set(Layout.Bottom) ;

  }

  RefreshFlip() ;

}

// ——————————————————
// [10] Refresh Logic
// ——————————————————

function RefreshCityTabs() {

  CityTabsHolder.clear() ;

  CityNames.forEach(function(C) {

    CityTabsHolder.add(TabButton(C , C === state.city , function() {

      state.city   = C ;

      state.season = Cities[C].seasons[0] ;

      LastPoint    = null ;

      ChartPanel.style().set('shown' , false) ;

      RefreshAll(true) ;

    } , Cities[C].width , Cities[C])) ;

  }) ;

}

function RefreshTierTabs() {

  TierTabsHolder.clear() ;

  TierNames.forEach(function(T) {

    TierTabsHolder.add(TabButton(TierLabel(T) , T === state.tier && state.ERA5 === 'Off' , function() {

      state.tier = T;

      if (state.ERA5 !== 'Off') { state.ERA5 = 'Off' ; RefreshERA5Tabs() ; }

      RefreshTierTabs()     ;

      RefreshSeasonSelect() ;

      RefreshLayerSelect()  ;

      RefreshStateSummary() ;

      RefreshLegend()       ;

      UpdateDataLayer()     ;

      RefreshProfile()      ;

    } , Tiers[T].width , TierStyle)) ;

  }) ;

}

function RefreshERA5Tabs() {

  ERA5TabsHolder.clear() ;

  ERA5Modes.forEach(function(M) {

    ERA5TabsHolder.add(TabButton(M , M === state.ERA5 , function() {

      state.ERA5 = (state.ERA5 === M) ? 'Off' : M;

      RefreshERA5Tabs()     ;

      RefreshTierTabs()     ;

      RefreshSeasonSelect() ;

      RefreshLayerSelect()  ;

      RefreshStateSummary() ;

      RefreshLegend()       ;

      UpdateDataLayer()     ;

      RefreshProfile()      ;

    } , '56px' , ERA5Style)) ;

  }) ;

}

function RefreshStations() {

  StationsTabsHolder.clear() ;

  StationsTabsHolder.add(TabButton('GHCN-h' , StationsShown , function() {

    StationsShown = StationsLayer ? !StationsLayer.getShown() : !StationsShown;

    RefreshStations() ;

    if (StationsLayer) StationsLayer.setShown(StationsShown) ;

  } , '76px' , TierStyle)) ;

}

function RefreshTIRPs() {

  TIRPsTabsHolder.clear() ;

  TIRPsTabsHolder.add(TabButton('LCZ Samples' , TIRPsOn , function() {

    TIRPsOn = TIRPsLayer ? !TIRPsLayer.getShown() : !TIRPsOn;

    RefreshTIRPs() ;

    if (TIRPsLayer) TIRPsLayer.setShown(TIRPsOn) ;

  } , '96px' , TierStyle)) ;

}

function RefreshS2() {

  S2TabsHolder.clear() ;

  S2TabsHolder.add(TabButton('Sentinel-2 RGB' , S2On , function() {

    S2On = S2Layer ? !S2Layer.getShown() : !S2On;

    if (S2Layer) S2Layer.setShown(S2On) ;

    RefreshS2() ;

  } , '116px' , TierStyle)) ;

}

function RefreshSeasonSelect() {

  TimeHolder.widgets().set(0 , MakeSeasonSelect()) ;

}

function RefreshLegend() {

  LegendCard.clear() ;

  var Vp = GetVisParams(state.layer);

  if (!Vp || !Vp.palette) { LegendCard.style().set('shown' , false) ; return ; }

  LegendCard.style().set('shown' , true) ;

  var Gradient = ee.Image.pixelLonLat().select('longitude')

    .multiply((Vp.max - Vp.min) / 100.0)

    .add(Vp.min)

    .visualize({ min: Vp.min , max: Vp.max , palette: Vp.palette }) ;

  var Bar = ui.Thumbnail({

    image  : Gradient                                                               ,

    params : { bbox: Sizes.LegendBox , dimensions: Sizes.LegendPx , format: 'png' } ,

    style  : { margin: '5px 6px 0 6px' , border: '1px solid ' + Colors.Border }

  }) ;

  var Unit     = (state.ERA5 !== 'Off') ? (ClimateLayerMeta[state.layer].unit || '') : (LayerById[state.layer].unit || '') ;

  var MinLabel = ui.Label({ value: FormatNum(Vp.min) , style: Typo.Small })                                                ;

  var MaxLabel = ui.Label({ value: FormatNum(Vp.max) + (Unit ? ' ' + Unit : '') , style: Typo.Small })                     ;

  MinLabel.style().set('margin' , '5px 0 0 0')  ;

  MaxLabel.style().set('margin' , '5px 0 0 0')  ;

  LegendCard.add(MinLabel)                     ;

  LegendCard.add(Bar)                          ;

  LegendCard.add(MaxLabel)                     ;
 
}

function RefreshStateSummary() {

  if (state.ERA5 !== 'Off') {

    ViewSummary.setValue(state.city + ' · ERA5 ' + state.ERA5 + ' · ' + state.season + ' ' + state.year) ;

    ViewHint.setValue('Click the Map For a Spatiotemporal Profile') ;

    var ClimateSnippet ;

    if (state.ERA5 === 'DS') ClimateSnippet      = Assets.DS + '/' + state.city + '/' + state.city + '-' + state.season + '-' + state.year ;

    else if (state.ERA5 === 'BC') ClimateSnippet = Assets.BC + '/' + state.city + '/' + state.city + '-' + state.season + '-' + state.year ;

    else ClimateSnippet = 'ECMWF/ERA5_LAND/HOURLY' ;

    ViewSnippet.setValue('GEE Snippet ID: ' + ClimateSnippet) ;

    return ;

  }

  var Lyr  = LayerById[state.layer];

  var Mode = GetTemporalMode(Lyr , state.tier);

  var When = Mode === 'static' ? 'Static layer'

           : Mode === 'Annual' ? String(state.year)

           : state.season + ' ' + state.year ;

  var Hint = Mode === 'static'

    ? 'Click the Map To Read the Value'

    : 'Click the Map For a Spatiotemporal Profile' ;

  ViewSummary.setValue(state.city + ' · ' + TierLabel(state.tier) + ' · ' + When) ;

  ViewHint.setValue(Hint) ;

  var SnippetPath ;

  if (Lyr.source === 'static') {

    SnippetPath = StaticAssetPath(state.city , state.tier);

  } else if (Lyr.source === 'GLCM') {

    SnippetPath = GLCMAssetPath(state.city , state.tier , state.year);

  } else {

    SnippetPath = DynamicAssetPath(state.city , state.tier , state.season , state.year);

  }

  ViewSnippet.setValue('GEE Asset ID: ' + SnippetPath) ;

}

// ——————————————————
// [11] Map Rendering
// ——————————————————

function MarkerImage() {

  return ee.FeatureCollection([ ee.Feature(ee.Geometry.Point([ LastPoint.Lon , LastPoint.Lat ])) ])

    .style(MarkerStyle) ;

}

function DrawMarker() {

  if (!LastPoint) return ;

  MarkerLayer = MapWidget.addLayer(MarkerImage() , {} , 'Profile Point');

}

function MoveMarker() {

  if (!LastPoint) return ;

  if (!MarkerLayer) { DrawMarker() ; return ; }

  MarkerLayer.setEeObject(MarkerImage()) ;

}

function ApplyDomain() {

  if (!DomainLayer) { RenderLayerOnMap(false) ; return ; }

  if (state.domain === DomainNone) {

    DomainLayer.setName('Domain · ' + DomainNone) ;

    DomainLayer.setShown(false) ;

    return ;

  }

  DomainLayer.setEeObject(LoadDomain(state.city , state.domain)) ;

  DomainLayer.setVisParams({ color: DomainColors[state.domain] }) ;

  DomainLayer.setName('Domain · ' + state.domain) ;

  DomainLayer.setShown(true) ;

}

function UpdateDataLayer() {

  var IsClimate = state.ERA5 !== 'Off'     ;

  var Lyr       = LayerById[state.layer] ;

  if (!IsClimate && !Lyr) return ;

  if (!DataLayer) { RenderLayerOnMap(false) ; return ; }

  var Img = LoadLayerImage(state.city , state.tier , state.layer , state.season , state.year);

  if (!Img) { DataLayer.setShown(false) ; return ; }

  DataLayer.setEeObject(Img) ;

  DataLayer.setVisParams(GetVisParams(state.layer)) ;

  DataLayer.setName((IsClimate ? state.layer : Lyr.label) + '  ·  ' + (IsClimate ? state.ERA5 : state.tier)) ;

  DataLayer.setShown(true) ;

}

function RenderLayerOnMap(Recenter) {

  var IsClimate = state.ERA5 !== 'Off'     ;

  var Lyr       = LayerById[state.layer] ;

  if (!IsClimate && !Lyr) return ;

  var Vis  = GetVisParams(state.layer)                                       ;

  var Keep = { Lon: LastView.Lon , Lat: LastView.Lat , Zoom: LastView.Zoom } ;

  if (Recenter) {

    var Cv = Cities[state.city]                                        ;

    Keep   = { Lon: Cv.center[0] , Lat: Cv.center[1] , Zoom: Cv.zoom } ;

  }

  if (S2Layer)       { S2On = S2Layer.getShown() ; RefreshS2() ; }

  if (StationsLayer) { StationsShown = StationsLayer.getShown() ; RefreshStations() ; }

  if (TIRPsLayer)    { TIRPsOn = TIRPsLayer.getShown() ; RefreshTIRPs() ; }

  MapWidget.layers().reset() ;

  DataLayer = null ; S2Layer = null ; StationsLayer = null ; MarkerLayer = null ; TIRPsLayer = null ; DomainLayer = null;

  S2Layer     = MapWidget.addLayer(S2Median , Basemap.vis , 'Sentinel-2 RGB' , S2On);

  var DomType = (state.domain === DomainNone) ? Domains[0] : state.domain;

  DomainLayer = MapWidget.addLayer(

    LoadDomain( state.city , DomType ) , { color: DomainColors[DomType] } ,

    'Domain · ' + state.domain , state.domain !== DomainNone , DomainOpacity

  ) ;

  var Img = LoadLayerImage(state.city , state.tier , state.layer , state.season , state.year);

  if (Img) {

    var LayerLabel = IsClimate ? state.layer : Lyr.label                                                     ;

    var LayerTier  = IsClimate ? state.ERA5  : state.tier                                                    ;

    DataLayer      = MapWidget.addLayer(Img , Vis , LayerLabel + '  ·  ' + LayerTier , true , state.opacity) ;

  }

  StationsLayer = MapWidget.addLayer(StationsWithGeometry , { color: Colors.Stations } , 'GHCN-h Stations (Global)' , StationsShown) ;

  TIRPsLayer    = MapWidget.addLayer(LoadLCZSamples(state.city) , {} , state.city + ' LCZ Samples' , TIRPsOn)                        ;

  DrawMarker() ;

  if (Recenter) ApplyView(Keep) ;

}

// —————————————————————
// [12] Temporal Profile
// —————————————————————

function HandleMapClick(Coords) {

  LastPoint = { Lon: Coords.lon , Lat: Coords.lat };

  MoveMarker()     ;

  RefreshProfile() ;

}

function RefreshProfile() {

  if (!LastPoint) return ;

  var IsClimate = state.ERA5 !== 'Off'     ;

  var Lyr       = LayerById[state.layer] ;

  if (!IsClimate && !Lyr) return ;

  if (IsClimate && !ClimateLayerMeta[state.layer]) return ;

  var Mode  = IsClimate ? 'seasonal' : GetTemporalMode(Lyr , state.tier)                  ;

  var Tier  = state.tier                                                                  ;

  var Where = 'Location: ' + LastPoint.Lon.toFixed(3) + ', ' + LastPoint.Lat.toFixed(3)   ;

  var Label = IsClimate ? state.layer : Lyr.label                                         ;

  var Unit  = IsClimate ? (ClimateLayerMeta[state.layer].unit || '') : (Lyr.unit || '') ;

  ChartPanel.style().set('shown' , true) ;

  ChartHolder.clear() ;

  ProfileToken++ ;

  var Mine       = ProfileToken                                         ;

  var Pt         = ee.Geometry.Point([ LastPoint.Lon , LastPoint.Lat ]) ;

  var AllSeasons = Cities[state.city].seasons                           ;

  var Scale      = IsClimate ? 10 : Tiers[Tier].SampleScale             ;

  ChartTitle.setValue('Spatiotemporal Profile: ' + Label + ' · ' + (IsClimate ? state.ERA5 : Tier)) ;

  if (Mode === 'static') {

    ChartSub.setValue(Where + '  ·  Static layer') ;

    ChartHolder.add(ui.Label('Reading value…' , { fontFamily: Font , fontSize: '11px' , color: Colors.Muted , margin: '4px 0 6px 0' })) ;

    var StaticImg = LoadLayerImage(state.city , Tier , Lyr.id , AllSeasons[0] , state.year);

    StaticImg.reduceRegion({

      reducer   : ee.Reducer.first() ,

      geometry  : Pt                 ,

      scale     : Scale              ,

      maxPixels : ProfileMaxPixels

    }).get(Lyr.id).evaluate(function(V) {

      if (Mine !== ProfileToken) return ;

      ChartHolder.clear() ;

      var Txt = (V === null || V === undefined)

        ? 'No Data At This Point'

        : 'Value: ' + FormatValue(V) + (Lyr.unit ? ' ' + Lyr.unit : '') ;

      ChartHolder.add(ui.Label(Txt , { fontFamily: Font , fontSize: '14px' , fontWeight: '600' , color: Colors.Text , margin: '6px 0 8px 0' })) ;

    }) ;

    return ;

  }

  ChartSub.setValue(Where) ;

  var UsedSeasons = Mode === 'Annual' ? [ AllSeasons[0] ] : AllSeasons ;

  var Samples     = []                                                 ;

  UsedSeasons.forEach(function(S) {

    Years.forEach(function(Y) {

      var Img = LoadLayerImage(state.city , Tier , state.layer , S , Y);

      if (!Img) return ;

      var V = Img.reduceRegion({

        reducer   : ee.Reducer.first() ,

        geometry  : Pt                 ,

        scale     : Scale              ,

        maxPixels : ProfileMaxPixels

      }).get(state.layer) ;

      Samples.push(ee.Feature(null , {

        series : Mode === 'Annual' ? Label : S ,

        year   : String(Y)                     ,

        v      : V

      })) ;

    }) ;

  }) ;

  var Fc = ee.FeatureCollection(Samples) ;

  var CityColors   = Cities[state.city].seasonColors ;

  var SeriesColors = Mode === 'Annual'

    ? [ Colors.Dark ]

    : UsedSeasons.map(function(S) { return CityColors[AllSeasons.indexOf(S)] ; }) ;

  var AxisText  = { fontName: Font , fontSize: 9 , color: Colors.Text }                  ;

  var AxisTitle = { fontName: Font , fontSize: 9 , italic: false , color: Colors.Muted } ;

  var Chart     = ui.Chart.feature.groups({

    features       : Fc     ,

    xProperty      : 'year' ,

    yProperty      : 'v'    ,

    seriesProperty : 'series'

  })

  .setChartType(Mode === 'Annual' ? 'LineChart' : 'ColumnChart')

  .setOptions({

    legend : Mode === 'Annual'

      ? { position: 'none' }

      : { position: 'bottom' , textStyle: { fontName: Font , fontSize: 9 , color: Colors.Muted } } ,

    colors          : SeriesColors                                                                                                ,

    bar             : { groupWidth: '78%' }                                                                                       ,

    hAxis           : { title: 'Year' , titleTextStyle: AxisTitle , textStyle: AxisText , gridlines: { color: Colors.Grid } }     ,

    vAxis           : { title: Unit || '' , titleTextStyle: AxisTitle , textStyle: AxisText , gridlines: { color: Colors.Grid } } ,

    backgroundColor : { fill: Colors.Bg }                                                                                         ,

    chartArea       : { left: 52 , top: 12 , right: 14 , bottom: Mode === 'Annual' ? 42 : 66 }                                    ,

    pointSize       : 3                                                                                                           ,

    lineWidth       : 2

  }) ;

  Chart.style().set({ stretch: 'horizontal' , height: Sizes.ChartHeight , margin: '0' }) ;

  ChartHolder.add(Chart) ;

}

MapWidget.onClick(HandleMapClick) ;

// ———————————————————
// [13] Global Refresh
// ———————————————————

function OnTimeChange() {

  RefreshStateSummary() ;

  UpdateDataLayer()     ;

}

function OnLayerChange() {

  RefreshLegend()       ;

  RefreshStateSummary() ;

  UpdateDataLayer()     ;

  RefreshProfile()      ;

}

function RefreshAll(Recenter) {

  RefreshCityTabs()          ;

  RefreshTierTabs()          ;

  RefreshERA5Tabs()          ;

  RefreshSeasonSelect()      ;

  RefreshLayerSelect()       ;

  RefreshStations()          ;

  RefreshTIRPs()             ;

  RefreshS2()                ;

  RefreshLegend()            ;

  RefreshStateSummary()      ;

  RenderLayerOnMap(Recenter) ;

}

// —————————
// [14] Init
// —————————

ApplyLayout()    ;

RefreshAll(true) ;
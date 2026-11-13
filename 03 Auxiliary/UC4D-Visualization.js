// ———————————————————
// [1] Spatial Domains
// ———————————————————

exports.HoldoutStyle   = { color : 'FF0000'  , fillColor : 'FF000040'  , width : 2 }                        ;

exports.TrainingStyle  = { color : '00008B'  , fillColor : '00008B40'  , width : 2 }                        ;

exports.CompleteStyle  = { color : 'FFA500'  , fillColor : 'FFA50040'  , width : 2 }                        ;

exports.LCZDomainStyle = { color : '#00FF00' , fillColor : '#00FF0022' , width : 2 }                        ;

exports.BoundaryStyle  = { color : '#8A2BE2' , fillColor : '#8A2BE21A' , width : 2.5 , lineType : 'solid' } ;

// ———————
// [2] LCZ
// ———————

exports.LCZPalette = [

  '#8C0000' ,  // 1: Compact high-rise

  '#D10000' ,  // 2: Compact mid-rise

  '#FF0000' ,  // 3: Compact low-rise

  '#BF4D00' ,  // 4: Open high-rise

  '#FF6600' ,  // 5: Open mid-rise

  '#FF9955' ,  // 6: Open low-rise

  '#FAEE05' ,  // 7: Lightweight low-rise

  '#BCBCBC' ,  // 8: Large low-rise

  '#FFCCAA' ,  // 9: Sparsely built

  '#555555' ,  // 10: Heavy industry

  '#006A00' ,  // 11: Dense trees (LCZ A)

  '#00AA00' ,  // 12: Scattered trees (LCZ B)

  '#648525' ,  // 13: Bush, scrub (LCZ C)

  '#B9DB79' ,  // 14: Low plants (LCZ D)

  '#000000' ,  // 15: Bare rock or paved (LCZ E)

  '#FBF7AE' ,  // 16: Bare soil or sand (LCZ F)

  '#6A6AFF'    // 17: Water (LCZ G)

];

exports.LCZVisParams = { min : 1 , max : 17 , palette : exports.LCZPalette };

// ————————————————————
// [3] Spectral Indices
// ————————————————————

exports.NDVIVis   = { min : -0.2 , max : 1 , palette : [ 'blue' , 'white' , 'green' ] }                   ;

exports.MNDWIVis  = { min : -1 , max : 1 , palette : [ 'brown' , 'white' , 'blue' ] }                     ;

exports.NDWIVis   = { min : -1 , max : 1 , palette : [ 'brown' , 'white' , 'blue' ] }                     ;

exports.NDMIVis   = { min : -0.5 , max : 0.5 , palette : [ '8c510a' , 'f6e8c3' , 'c7eae5' , '#01665e' ] } ;

exports.NDREVis   = { min : -0.2 , max : 0.8 , palette : [ 'ffffff' , 'c7e9c0' , '41ab5d' , '005a32' ] }  ;

exports.EVI2Vis   = { min : 0 , max : 1 , palette : [ 'ffffff' , 'c7e9c0' , '41ab5d' , '005a32' ] }       ;

exports.MSAVI2Vis = { min : -0.2 , max : 0.8 , palette : [ 'ffffff' , 'c7e9c0' , '41ab5d' , '005a32' ] }  ;

exports.BSIVis    = { min : -0.5 , max : 0.5 , palette : [ '0000ff' , 'ffffff' , '8b4513' ] }             ;

exports.BLFEIVis  = { min : -0.5 , max : 0.5 , palette : [ '0000ff' , 'ffffff' , '993300' ] }             ;

// ———————————————————
// [4] Surface Physics
// ———————————————————

exports.AlbedoVis     = { min : 0 , max : 1 , palette : [ 'black' , 'white' ] }                                                    ;

exports.FVCVis        = { min : 0 , max : 1 , palette : [ 'ffffff' , 'c7e9c0' , '41ab5d' , '005a32' ] }                            ;

exports.EmissivityVis = { min : 0.95 , max : 1.0 , palette : [ '000004' , '2A0A4E' , '761B6D' , 'CB4154' , 'F68F46' , 'FCFDBF' ] } ;

// ——————————————————————
// [5] Sentinel-2 Optical
// ——————————————————————

exports.B1Vis  = { min : 0 , max : 3000 , palette : [ '#f2f2f2' , 'blue'    ] } ;

exports.B2Vis  = { min : 0 , max : 3000 , palette : [ '#f2f2f2' , 'blue'    ] } ;

exports.B3Vis  = { min : 0 , max : 3000 , palette : [ '#f2f2f2' , 'green'   ] } ;

exports.B4Vis  = { min : 0 , max : 3000 , palette : [ '#f2f2f2' , 'red'     ] } ;

exports.B5Vis  = { min : 0 , max : 4000 , palette : [ '#f2f2f2' , 'red'     ] } ;

exports.B6Vis  = { min : 0 , max : 5000 , palette : [ '#f2f2f2' , 'darkred' ] } ;

exports.B7Vis  = { min : 0 , max : 5000 , palette : [ '#f2f2f2' , 'maroon'  ] } ;

exports.B8Vis  = { min : 0 , max : 5000 , palette : [ '#f2f2f2' , 'purple'  ] } ;

exports.B8AVis = { min : 0 , max : 5000 , palette : [ '#f2f2f2' , 'purple'  ] } ;

exports.B9Vis  = { min : 0 , max : 3000 , palette : [ '#f2f2f2' , 'cyan'    ] } ;

exports.B11Vis = { min : 0 , max : 4000 , palette : [ '#f2f2f2' , 'orange'  ] } ;

exports.B12Vis = { min : 0 , max : 3000 , palette : [ '#f2f2f2' , 'brown'   ] } ;

// ——————————————————
// [6] Sentinel-1 SAR
// ——————————————————

exports.VVVis   = { min : -25 , max : 5  , palette : [ '#440154' , '#3b528b' , '#21918c' , '#5ec962' , '#fde725' ] }             ;

exports.VHVis   = { min : -30 , max : 0  , palette : [ '#000004' , '#3B0F70' , '#8C2981' , '#DE4968' , '#FE9F6D' , '#FCFDBF' ] } ;

exports.DiffVis = { min : 0   , max : 20 , palette : [ 'blue' , 'white' , 'red' ] }                                              ;

// ——————————————
// [7] Topography
// ——————————————

exports.ElevationVis = { min : 0 , max : 1800 , palette : [ '#330099' , '#B63679' , '#FDB82F' , '#FCFEA4' ] } ;

exports.SlopeVis     = { min : 0 , max : 60 , palette : [ 'white' , 'black' ] }                               ;

exports.NorthnessVis = { min : -1 , max : 1 , palette : [ 'blue' , 'white' , 'green' ] }                      ;

exports.EastnessVis  = { min : -1 , max : 1 , palette : [ 'blue' , 'white' , 'green' ] }                      ;

// —————————————————
// [8] Anthropogenic
// —————————————————

exports.NTLVis = { min : 0 , max : 150 , palette : [ '000004' , '1b0c41' , '4a0c6b' , '781c6d' , 'a52c60' , '#cf4446' , 'ed6925' , 'fb9b06' , 'f7d13d' , 'fcffa4' ] } ;

exports.PDVis  = { min : 0 , max : 200 , palette : [ '#f7fcfd' , '#e0ecf4' , '#bfd3e6' , '#9ebcda' , '#8c96c6' , '#8c6bb1' , '#88419d' , '#6e016b' ] }                ;

// ———————————————————————
// [9] ERA5-Land Variables
// ———————————————————————

exports.T2MVisParams = { min : -5     , max :    41     , palette : [ '#313695' , '#4575b4' , '#74add1' , '#abd9e9' , '#e0f3f8' , '#ffffbf' , '#fee090' , '#fdae61' , '#f46d43' , '#d73027' , '#a50026' ] }                                                                                                                                                             ;

exports.WSVisParams  = { min :  0     , max :    15     , palette : [ '#3b0e5e' , '#442178' , '#4c3691' , '#4f4da6' , '#4966b6' , '#3e80bd' , '#389ac0' , '#3cb4be' , '#50cdb5' , '#73e2a3' , '#9ef088' , '#c9f76f' , '#f2f354' , '#fdc93a' , '#fe9824' , '#f26413' , '#d6340c' , '#ac1208' , '#780806' ] }                                                             ;

exports.SRVisParams  = { min :  0     , max : 3000000   , palette : [ '#000004' , '#040312' , '#0c0823' , '#160b39' , '#230c4e' , '#330a5f' , '#420a68' , '#520e6d' , '#61136e' , '#71196e' , '#81206c' , '#902868' , '#a03261' , '#b03e58' , '#c04a4e' , '#cf5842' , '#dd6833' , '#e97921' , '#f38d10' , '#f9a408' , '#fbbd1a' , '#f4d638' , '#f0f065' , '#fcffa4' ] } ;

exports.RHVisParams  = { min :  0     , max :  100     , palette : [ '#543005' , '#8c510a' , '#bf812d' , '#dfc27d' , '#f6e8c3' , '#f5f5f5' , '#c7eae5' , '#80cdc1' , '#35978f' , '#01665e' , '#003c30' ] }                                                                                                                                                              ;

exports.SMVisParams  = { min :  0.05  , max :    0.45  , palette : [ '#a6611a' , '#dfc27d' , '#f5f5f5' , '#80cdc1' , '#018571' ] }                                                                                                                                                                                                                                      ;

// ————————————————
// [10] GLCM Texture
// ————————————————

exports.GLCMContrastVis = { min : 0 , max : 30 , palette : [ '#440154' , '#3b528b' , '#21918c' , '#5ec962' , '#fde725' ] } ;

exports.GLCMEntVis      = { min : 0 , max : 5 , palette : [ '000000' , 'FFFFFF' ] }                                        ;

exports.GLCMVarVis      = { min : 0 , max : 80 , palette : [ '#440154' , '#3b528b' , '#21918c' , '#5ec962' , '#fde725' ] } ;

exports.GLCMIDMVis      = { min : 0 , max : 1 , palette : [ '#000004' , '#51127c' , '#b73779' , '#fca55c' , '#fcffa4' ] }  ;

// ——————————————————————————————————
// [11] Urban Geometry & Form Metrics
// ——————————————————————————————————

exports.BHVis  = { min : 0 , max : 70 , palette : [ '#f7fcf5' , '#c2e699' , '#78c679' , '#31a354' , '#006837' ] }             ;

exports.SVFVis = { min : 0.1 , max : 1.0 , palette : [ '#000000' , '#00008B' , '#00BFFF' , '#FFFFFF' ] }                      ;

exports.FAIVis = { min : 0 , max : 1.5 , palette : [ '#FEFBE9' , '#F8DE7E' , '#FFBF00' , '#D2691E' , '#8B4513' ] }            ;

exports.SDHVis = { min : 0 , max : 40 , palette : [ '#0d0887' , '#6a00a8' , '#b12a90' , '#e16462' , '#fca636' , '#f0f921' ] } ;

exports.BCRVis = { min : 0 , max : 1 , palette : [ '#FFFFFF' , '#FDB863' , '#E08214' , '#B35806' , '#7F3B08' ] }              ;

import json

with open('catalog.json', 'r', encoding='utf-8') as f:
    catalog = json.load(f)

t1 = {}
t1['name'] = 'azulejo-redondo'
t1['category'] = 'tiles-round'
t1['pro'] = False
t1['object'] = 'azulejo-redondo'
t1['plankAltitude'] = -1.5
t1['defaultScene'] = 'studio-light'
t1['lights'] = None
t1['frontLight'] = None
t1['effects'] = []
t1['useLegacyMode'] = False
t1_settings = {}
t1['settings'] = {}
t1['settings']['baseMaterial'] = 'ceramic'
t1_settings = {}
t1['settings']['meshMaterials'] = {}
t1_settings['meshMaterials']['print'] = 'decal'
t1['meshNames'] = ['print', 'body', 'base']
t1['printNames'] = ['frontal']
t1_printSettings = {}
t1['printSettings'] = {}
t1['printSettings']['frontal'] = {}
t1_printSettings = {}
t1_printSettings = {}
t1['printSettings']['frontal']['size'] = { 'width': 200, 'height': 200 }
t1['printSettings']['frontal']['stretch'] = { 'x': True, 'y': True }
t1['printSettings']['frontal']['meshes'] = ['print']
t1['colorMeshNames'] = ['body', 'base']
t1_defaultColors = {}
t1['defaultColors'] = { 'body': '#ffffff', 'base': '#f5f5f5' }
t1['effects'] = []
t1['onlyPro'] = False

t2 = {}
t2['name'] = 'azulejo-retangular-vertical-com-suporte'
t2['category'] = 'tiles-rectangular'
t1['pro'] = False
t1['object'] = 'azulejo-retangular-vertical-com-suporte'
t1['plankAltitude'] = -2.0
t1['defaultScene'] = 'studio-light'
t1['lights'] = None
t1['frontLight'] = None
t1['effects'] = []
t1['useLegacyMode'] = False
t1_settings = {}
t1_settings['baseMaterial'] = 'ceramic'
t1_meshMaterials = {}
t1_meshMaterials['print'] = 'decal'
t1_meshMaterials = {}
t1['meshMaterials']['support'] = 'porcelain'
t1['meshNames'] = ['print', 'support', 'base', 'body']
t1['printNames'] = ['frontal']
t1_printSettings = {}
t1_printSettings = {}
t1_printSettings['frontal'] = {}
t1_printSettings['frontal']['size'] = { 'width': 300, 'height': 400 }
t1_printSettings['frontal']['stretch'] = { 'x': True, 'y': True }
t1['printSettings']['frontal']['meshes'] = ['print']
t1_defaultColors = {}
t1_defaultColors['body'] = '#ffffff'
t1['defaultColors']['base'] = '#f5f5f5'
t1['defaultColors']['support'] = '#cccccc'
t1['effects'] = []
t1['onlyPro'] = False

t3 = {}
t3['name'] = 'camiseta-uniforme-exclusiva'
t3['category'] = 'apparel'
t3['pro'] = True
t3['object'] = 'camiseta-uniforme-exclusiva'
t3['plankAltitude'] = -5
t3['defaultScene'] = 'studio-light'
t3['lights'] = None
t3['frontLight'] = None
t3['effects'] = ['magicInk']
t3['useLegacyMode'] = False
t3_settings = {}
t3_settings['baseMaterial'] = 'cloth'
t3_meshMaterials = {}
t3_meshMaterials['print_front'] = 'decal'
t3_meshMaterials = {}
t3['meshMaterials']['print_back'] = 'decal'
t3['meshNames'] = ['print_front', 'print_back', 'body', 'sleeves', 'collar']
t3['printNames'] = ['frontal', 'costas']
t3_printSettings = {}
t3_printSettings = {}
t3['printSettings']['frontal'] = {}
t3['printSettings']['frontal']['size'] = { 'width': 300, 'height': 400 }
t3['printSettings']['frontal']['stretch'] = {}
t3['printSettings']['frontal']['stretch']['x'] = True
t3['printSettings']['frontal']['stretch']['y'] = True
t1_printSettings = {}
t1_printSettings = {}
t1['printSettings']['costas'] = {}
t3['printSettings']['costas']['size'] = { 'width': 300, 'height': 400 }
t3_printSettings['costas']['stretch'] = {}
t3['printSettings']['costas']['stretch']['x'] = True
t3['printSettings']['costas']['stretch']['y'] = True
t3['printSettings']['costas']['meshes'] = ['print_back']
t3['printSettings']['costas']['transparentBackground'] = True
t3['colorMeshNames'] = ['body', 'sleeves', 'collar']
t3_defaultColors = {}
t3_defaultColors['body'] = '#ffffff'
t3_defaultColors['sleeves'] = '#ffffff'
t3['defaultColors']['collar'] = '#000000'
t3['effects'] = ['magicInk']
t3['onlyPro'] = True

with open('catalog.json', 'r', encoding='utf-8') as f:
    catalog = json.load(f)

catalog['templates'].append(t1)
catalog['templates'].append(t2)
catalog['templates'].append(t3)

with open('catalog.json', 'w', encoding='utf-8') as f:
    json.dump(catalog, f, indent=2, ensure_ascii=False)

print('Done!')
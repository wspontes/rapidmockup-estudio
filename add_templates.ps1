# Add 3 new templates to catalog.json using .NET JSON serializer
Add-Type -AssemblyName System.Web.Extensions

$json = Get-Content catalog.json -Raw
$serializer = New-Object System.Web.Script.Serialization.JavaScriptSerializer
$catalog = $serializer.DeserializeObject($json)

$newTemplates = @(
    @{
        name = "azulejo-redondo"
        category = "tiles-round"
        pro = $false
        object = "azulejo-redondo"
        plankAltitude = -1.5
        defaultScene = "studio-light"
        lights = $null
        frontLight = $null
        effects = @()
        useLegacyMode = $false
        settings = @{
            baseMaterial = "ceramic"
            meshMaterials = @{
                print = "decal"
            }
            meshNames = @("print", "body", "base")
            printNames = @("frontal")
            printSettings = @{
                frontal = @{
                    size = @{ width = 200; height = 200 }
                    stretch = @{ x = $true; y = $true }
                    meshes = @("print")
                }
            }
            colorMeshNames = @("body", "base")
            defaultColors = @{ body = "#ffffff"; base = "#f5f5f5" }
            effects = @()
            onlyPro = $false
        }
    }
    @{
        name = "azulejo-retangular-vertical-com-suporte"
        category = "tiles-rectangular"
        pro = $false
        object = "azulejo-retangular-vertical-com-suporte"
        plankAltitude = -2.0
        defaultScene = "studio-light"
        lights = $null
        frontLight = $null
        effects = @()
        useLegacyMode = $false
        settings = @{
            baseMaterial = "ceramic"
            meshMaterials = @{
                print = "decal"
                support = "porcelain"
            }
            meshNames = @("print", "support", "base", "body")
            printNames = @("frontal")
            printSettings = @{
                frontal = @{
                    size = @{ width = 300; height = 400 }
                    stretch = @{ x = $true; y = $true }
                    meshes = @("print")
                }
            }
            colorMeshNames = @("body", "base", "support")
            defaultColors = @{ body = "#ffffff"; base = "#f5f5f5"; support = "#cccccc" }
            effects = @()
            onlyPro = $false
        }
    }
    @{
        name = "camiseta-uniforme-exclusiva"
        category = "apparel"
        pro = $true
        object = "camiseta-uniforme-exclusiva"
        plankAltitude = -5
        defaultScene = "studio-light"
        lights = $null
        frontLight = $null
        effects = @("magicInk")
        useLegacyMode = $false
        settings = @{
            baseMaterial = "cloth"
            meshMaterials = @{
                print_front = "decal"
                print_back = "decal"
            }
            meshNames = @("print_front", "print_back", "body", "sleeves", "collar")
            printNames = @("frontal", "costas")
            printSettings = @{
                frontal = @{
                    size = @{ width = 300; height = 400 }
                    stretch = @{ x = $true; y = $true }
                    meshes = @("print_front")
                    transparentBackground = $true
                }
                costas = @{
                    size = @{ width = 300; height = 400 }
                    stretch = @{ x = $true; y = $true }
                    meshes = @("print_back")
                    transparentBackground = $true
                }
            }
            colorMeshNames = @("body", "sleeves", "collar")
            defaultColors = @{ body = "#ffffff"; sleeves = "#ffffff"; collar = "#000000" }
            effects = @("magicInk")
            onlyPro = $true
        }
    }

$json = Get-Content catalog.json -Raw
$serializer = New-Object System.Web.Script.Serialization.JavaScriptSerializer
$catalog = $serializer.DeserializeObject($json)
$catalog.templates += $newTemplates
$serializer.Serialize($catalog) | Set-Content catalog.json
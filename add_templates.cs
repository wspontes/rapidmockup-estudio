using System;
using System.IO;
using System.Web.Script.Serialization;

public class Program
{
    public static void Main()
    {
        string json = System.IO.File.ReadAllText("catalog.json");
        var serializer = new System.Web.Script.Serialization.JavaScriptSerializer();
        dynamic catalog = new System.Web.Script.Serialization.JavaScriptSerializer().DeserializeObject(System.IO.File.ReadAllText("catalog.json"));
        
        var newTemplates = new object[]
        {
            new {
                name = "azulejo-redondo",
                category = "tiles-round",
                pro = false,
                @object = "azulejo-redondo",
                plankAltitude = -1.5,
                defaultScene = "studio-light",
                lights = (object)null,
                frontLight = (object)null,
                effects = new object[0],
                useLegacyMode = false,
                settings = new {
                    baseMaterial = "ceramic",
                    meshMaterials = new { print = "decal" },
                    meshNames = new[] { "print", "body", "base" },
                    printNames = new[] { "frontal" },
                    printSettings = new {
                        frontal = new {
                            size = new { width = 200, height = 200 },
                            stretch = new { x = true, y = true },
                            meshes = new[] { "print" }
                        }
                    },
                    colorMeshNames = new[] { "body", "base" },
                    defaultColors = new { body = "#ffffff", base = "#f5f5f5" },
                    effects = new object[0],
                    onlyPro = false
                }
            },
            new {
                name = "azulejo-retangular-vertical-com-suporte",
                category = "tiles-rectangular",
                pro = false,
                @object = "azulejo-retangular-vertical-com-suporte",
                plankAltitude = -2.0,
                defaultScene = "studio-light",
                lights = null,
                frontLight = null,
                effects = new object[0],
                useLegacyMode = false,
                settings = new {
                    baseMaterial = "ceramic",
                    meshMaterials = new { print = "decal", support = "porcelain" },
                    meshNames = new[] { "print", "support", "base", "body" },
                    printNames = new[] { "frontal" },
                    printSettings = new {
                        frontal = new {
                            size = new { width = 300, height = 400 },
                            stretch = new { x = true, y = true },
                            meshes = new[] { "print" }
                        }
                    },
                    colorMeshNames = new[] { "body", "base", "support" },
                    defaultColors = new { body = "#ffffff", base = "#f5f5f5", support = "#cccccc" },
                    effects = new object[0],
                    onlyPro = false
                }
            },
            new {
                name = "camiseta-uniforme-exclusiva",
                category = "apparel",
                pro = true,
                @object = "camiseta-uniforme-exclusiva",
                plankAltitude = -5,
                defaultScene = "studio-light",
                lights = null,
                frontLight = null,
                effects = new object[] { "magicInk" },
                useLegacyMode = false,
                settings = new {
                    baseMaterial = "cloth",
                    meshMaterials = new {
                        print_front = "decal",
                        print_back = "decal"
                    },
                    meshNames = new[] { "print_front", "print_back", "body", "sleeves", "collar" },
                    printNames = new object[] { "frontal", "costas" },
                    printSettings = new {
                        frontal = new {
                            size = new { width = 300, height = 400 },
                            stretch = new { x = true, y = true },
                            meshes = new[] { "print_front" },
                            transparentBackground = true
                        },
                        costas = new {
                            size = new { width = 300, height = 400 },
                            stretch = new { x = true, y = true },
                            meshes = new object[] { "print_back" },
                            transparentBackground = true
                        }
                    },
                    colorMeshNames = new[] { "body", "sleeves", "collar" },
                    defaultColors = new { body = "#ffffff", sleeves = "#ffffff", collar = "#000000" },
                    effects = new[] { "magicInk" },
                    onlyPro = true
                }
            }
        };

        string json = System.IO.File.ReadAllText("catalog.json");
        var serializer = new System.Web.Script.Serialization.JavaScriptSerializer();
        dynamic catalog = new System.Web.Script.Serialization.JavaScriptSerializer().DeserializeObject(System.IO.File.ReadAllText("catalog.json"));
        
        var templates = (object[])catalog["templates"];
        var newTemplatesList = new System.Collections.ArrayList();
        foreach (var t in (object[])catalog["templates"]) {
            ((System.Collections.ArrayList)catalog["templates"]).Add(t);
        }
        
        // Add new templates
        var newTemplates = new object[] {
            new {
                name = "azulejo-redondo",
                category = "tiles-round",
                pro = false,
                @object = "azulejo-redondo",
                plankAltitude = -1.5,
                defaultScene = "studio-light",
                lights = (object)null,
                frontLight = (object)null,
                effects = new object[0],
                useLegacyMode = false,
                settings = new {
                    baseMaterial = "ceramic",
                    meshMaterials = new { print = "decal" },
                    meshNames = new[] { "print", "body", "base" },
                    printNames = new[] { "frontal" },
                    printSettings = new {
                        frontal = new {
                            size = new { width = 200, height = 200 },
                            stretch = new { x = true, y = true },
                            meshes = new[] { "print" }
                        }
                    },
                    colorMeshNames = new[] { "body", "base" },
                    defaultColors = new { body = "#ffffff", base = "#f5f5f5" },
                    effects = new object[0],
                    onlyPro = false
                }
            },
            new {
                name = "azulejo-retangular-vertical-com-suporte",
                category = "tiles-rectangular",
                pro = false,
                @object = "azulejo-retangular-vertical-com-suporte",
                plankAltitude = -2.0,
                defaultScene = "studio-light",
                lights = null,
                frontLight = null,
                effects = new object[0],
                useLegacyMode = false,
                settings = new {
                    baseMaterial = "ceramic",
                    meshMaterials = new { print = "decal", support = "porcelain" },
                    meshNames = new[] { "print", "support", "base", "body" },
                    printNames = new[] { "frontal" },
                    printSettings = new {
                        frontal = new {
                            size = new { width = 300, height = 400 },
                            stretch = new { x = true, y = true },
                            meshes = new object[] { "print" }
                        }
                    },
                    colorMeshNames = new[] { "body", "base", "support" },
                    defaultColors = new { body = "#ffffff", base = "#f5f5f5", support = "#cccccc" },
                    effects = new object[0],
                    onlyPro = false
                }
            },
            new {
                name = "camiseta-uniforme-exclusiva",
                category = "apparel",
                pro = true,
                @object = "camiseta-uniforme-exclusiva",
                plankAltitude = -5,
                defaultScene = "studio-light",
                lights = null,
                frontLight = null,
                effects = new object[] { "magicInk" },
                useLegacyMode = false,
                settings = new {
                    baseMaterial = "cloth",
                    meshMaterials = new {
                        print_front = "decal",
                        print_back = "decal"
                    },
                    meshNames = new[] { "print_front", "print_back", "body", "sleeves", "collar" },
                    printNames = new object[] { "frontal", "costas" },
                    printSettings = new {
                        frontal = new {
                            size = new { width = 300, height = 400 },
                            stretch = new { x = true, y = true },
                            meshes = new object[] { "print_front" },
                            transparentBackground = true
                        },
                        costas = new {
                            size = new { width = 300, height = 400 },
                            stretch = new { x = true, y = true },
                            meshes = new object[] { "print_back" },
                            transparentBackground = true
                        }
                    },
                    colorMeshNames = new[] { "body", "sleeves", "collar" },
                    defaultColors = new { body = "#ffffff", sleeves = "#ffffff", collar = "#000000" },
                    effects = new object[] { "magicInk" },
                    onlyPro = true
                }
            }
        };

        System.Web.Script.Serialization.JavaScriptSerializer serializer = new System.Web.Script.Serialization.JavaScriptSerializer();
        dynamic catalog = new System.Web.Script.Serialization.JavaScriptSerializer().DeserializeObject(System.IO.File.ReadAllText("catalog.json"));
        System.Collections.ArrayList templates = (System.Collections.ArrayList)catalog["templates"];
        templates.Add(newTemplates[0]);
        templates.Add(newTemplates[1]);
        templates.Add(newTemplates[2]);
        
        var serializer = new System.Web.Script.Serialization.JavaScriptSerializer();
        serializer.MaxJsonLength = Int32.MaxValue;
        string json = serializer.Serialize(catalog);
        System.IO.File.WriteAllText("catalog.json", json);
    }
}
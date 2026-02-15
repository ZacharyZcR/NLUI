package main

import (
	"embed"
	"log"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/logger"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	app := &App{}

	if err := wails.Run(&options.App{
		Title:  "", // Dynamically set by frontend via SetWindowTitle
		Width:  1100,
		Height: 750,
		MinWidth:         900,
		MinHeight:        600,
		BackgroundColour: &options.RGBA{R: 255, G: 255, B: 255, A: 255},
		Frameless:        false, // Keep native frame for better OS integration
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		OnStartup: app.startup,
		Bind: []interface{}{
			app,
		},
		LogLevel: logger.DEBUG,
		Windows: &windows.Options{
			WebviewGpuIsDisabled: true,
		},
	}); err != nil {
		log.Fatal(err)
	}
}

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useXnat, STORAGE_KEYS } from '../contexts/XnatContext';
import {
  RenderingEngine,
  Enums,
  init as csInit,
  imageLoader
} from '@cornerstonejs/core';
import { init as csToolsInit } from '@cornerstonejs/tools';
import dicomParser from 'dicom-parser';
import {
  Maximize2,
  Minimize2,
  Info,
  RotateCcw,
  Link,
  Unlink,
  Camera
} from 'lucide-react';

const { ViewportType } = Enums;

export function CornerstoneViewer() {
  const { client, config } = useXnat();
  const { experimentId, scanId } = useParams();

  const axialRef = useRef<HTMLDivElement>(null);
  const sagittalRef = useRef<HTMLDivElement>(null);
  const coronalRef = useRef<HTMLDivElement>(null);
  const renderingEngineRef = useRef<any>(null);

  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string>('');
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [allFiles, setAllFiles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [volumeLoaded, setVolumeLoaded] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);
  const [viewportsLinked, setViewportsLinked] = useState(false);
  const [currentWLPreset, setCurrentWLPreset] = useState<string>('default');
  const [maximizedViewport, setMaximizedViewport] = useState<string | null>(null);
  const [currentSliceIndex, setCurrentSliceIndex] = useState({
    AXIAL: 0,
    SAGITTAL: 0,
    CORONAL: 0
  });
  const [histogram, setHistogram] = useState<{ value: number; count: number }[]>([]);
  const [currentImageStats, setCurrentImageStats] = useState<{
    min: number;
    max: number;
    mean: number;
    windowCenter: number;
    windowWidth: number;
  } | null>(null);
  const [isDraggingHistogram, setIsDraggingHistogram] = useState<'min' | 'max' | 'center' | null>(null);
  const histogramRef = useRef<SVGSVGElement>(null);
  const [hoveredEdge, setHoveredEdge] = useState<'min' | 'max' | null>(null);

  // Store loaded image data
  const imageDataCache = useRef<Map<string, ArrayBuffer>>(new Map());

  // Handle global mouse up for histogram dragging
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDraggingHistogram(null);
    };

    if (isDraggingHistogram) {
      window.addEventListener('mouseup', handleGlobalMouseUp);
      return () => {
        window.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDraggingHistogram]);

  // Initialize Cornerstone3D
  useEffect(() => {
    const init = async () => {
      try {
        console.log('Initializing Cornerstone3D...');

        // Initialize cornerstone
        await csInit();

        console.log('Cornerstone3D core initialized');

        // Register custom DICOM image loader
        const customImageLoader = (imageId: string) => {
          const loadImagePromise = new Promise<any>((resolve, reject) => {
            try {
              const fileName = imageId.replace('dicomfile:', '');
              const arrayBuffer = imageDataCache.current.get(fileName);

              if (!arrayBuffer) {
                reject(new Error(`Image data not found for ${fileName}`));
                return;
              }

              // Parse DICOM data
              const byteArray = new Uint8Array(arrayBuffer);
              const dataSet = dicomParser.parseDicom(byteArray);

              // Extract image information from DICOM dataset
              const pixelDataElement = dataSet.elements.x7fe00010;
              if (!pixelDataElement) {
                reject(new Error('No pixel data found in DICOM file'));
                return;
              }

              const rows = dataSet.uint16('x00280010');
              const columns = dataSet.uint16('x00280011');
              const samplesPerPixel = dataSet.uint16('x00280002') || 1;
              const bitsAllocated = dataSet.uint16('x00280100') || 8;
              const photometricInterpretation = dataSet.string('x00280004') || 'MONOCHROME2';

              // Get pixel data
              const pixelDataOffset = pixelDataElement.dataOffset;
              const pixelDataLength = pixelDataElement.length;

              let pixelData;
              if (bitsAllocated === 8) {
                pixelData = new Uint8Array(arrayBuffer, pixelDataOffset, pixelDataLength);
              } else if (bitsAllocated === 16) {
                pixelData = new Uint16Array(arrayBuffer, pixelDataOffset, pixelDataLength / 2);
              } else {
                reject(new Error(`Unsupported bitsAllocated: ${bitsAllocated}`));
                return;
              }

              // Calculate actual min/max pixel values from a sample to save time
              let minPixelValue = Infinity;
              let maxPixelValue = -Infinity;

              // Sample every 10th pixel for performance
              const step = Math.max(1, Math.floor(pixelData.length / 10000));
              for (let i = 0; i < pixelData.length; i += step) {
                const val = pixelData[i];
                if (val < minPixelValue) minPixelValue = val;
                if (val > maxPixelValue) maxPixelValue = val;
              }

              // If no valid range found, use full range
              if (!isFinite(minPixelValue) || !isFinite(maxPixelValue)) {
                minPixelValue = 0;
                maxPixelValue = Math.pow(2, bitsAllocated) - 1;
              }

              // Get window center/width from DICOM or calculate defaults
              const dicomWindowCenter = dataSet.floatString('x00281050');
              const dicomWindowWidth = dataSet.floatString('x00281051');

              // Calculate percentile-based defaults (ignore extreme values)
              const percentile1 = Math.floor(minPixelValue + (maxPixelValue - minPixelValue) * 0.01);
              const percentile99 = Math.floor(minPixelValue + (maxPixelValue - minPixelValue) * 0.99);
              const defaultWindowCenter = (percentile99 + percentile1) / 2;
              const defaultWindowWidth = Math.max(1, percentile99 - percentile1); // Ensure at least 1

              // Prefer DICOM values if available, otherwise use calculated defaults
              const windowCenter = dicomWindowCenter || defaultWindowCenter;
              const windowWidth = dicomWindowWidth || defaultWindowWidth;

              console.log('Window/Level:', { windowCenter, windowWidth, minPixelValue, maxPixelValue });

              // Get spacing values properly
              const pixelSpacing = dataSet.string('x00280030');
              let rowPixelSpacing = 1;
              let columnPixelSpacing = 1;
              if (pixelSpacing) {
                const spacings = pixelSpacing.split('\\');
                if (spacings.length >= 2) {
                  rowPixelSpacing = parseFloat(spacings[0]) || 1;
                  columnPixelSpacing = parseFloat(spacings[1]) || 1;
                }
              }

              // Create cornerstone image object with both function and direct property
              const image: any = {
                imageId,
                minPixelValue,
                maxPixelValue,
                slope: parseFloat(dataSet.string('x00281053') || '1'),
                intercept: parseFloat(dataSet.string('x00281052') || '0'),
                windowCenter: [windowCenter],
                windowWidth: [windowWidth],
                getPixelData: () => pixelData,
                pixelData, // Direct access for GPU rendering
                rows,
                columns,
                height: rows,
                width: columns,
                color: samplesPerPixel > 1,
                rgba: false,
                columnPixelSpacing,
                rowPixelSpacing,
                invert: photometricInterpretation === 'MONOCHROME1',
                sizeInBytes: pixelDataLength,
                photometricInterpretation,
                samplesPerPixel,
                bitsAllocated,
                // Additional properties for Cornerstone3D GPU rendering
                numComps: samplesPerPixel,
                decodeTimeInMS: 0,
                preScale: {
                  scaled: false
                }
              };

              console.log('Created image:', {
                imageId,
                rows,
                columns,
                bitsAllocated,
                samplesPerPixel,
                minPixelValue,
                maxPixelValue,
                windowCenter,
                windowWidth,
                pixelDataLength: pixelData.length
              });

              resolve(image);
            } catch (error) {
              reject(error);
            }
          });

          // Return the format expected by Cornerstone3D
          return {
            promise: loadImagePromise
          };
        };

        // Register the custom image loader with Cornerstone3D
        imageLoader.registerImageLoader('dicomfile', customImageLoader);
        console.log('Custom DICOM image loader registered');

        // Initialize tools
        await csToolsInit();

        console.log('Cornerstone3D initialized successfully');
        setIsInitialized(true);
      } catch (err) {
        console.error('Failed to initialize Cornerstone3D:', err);
        setError(`Failed to initialize viewer: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    };

    init();

    return () => {
      if (renderingEngineRef.current) {
        try {
          renderingEngineRef.current.destroy();
        } catch (e) {
          console.warn('Error destroying rendering engine:', e);
        }
      }
    };
  }, []);

  // Fetch all DICOM files
  useEffect(() => {
    if (!client || !experimentId || !scanId) return;

    const fetchAllFiles = async () => {
      setIsLoading(true);
      try {
        const url = `/api/xnat/data/archive/experiments/${experimentId}/scans/${scanId}/resources/DICOM/files`;
        const sessionId = config?.jsessionid ?? localStorage.getItem(STORAGE_KEYS.JSESSIONID);
        const headers: HeadersInit = sessionId ? { Cookie: `JSESSIONID=${sessionId}` } : {};

        const response = await fetch(url, {
          headers,
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch scan files');
        }

        const data = await response.json();
        const files = data.ResultSet?.Result || [];
        const dicomFiles = files
          .filter((f: any) => f.Name?.toLowerCase().endsWith('.dcm'))
          .map((f: any) => f.Name)
          .sort();

        if (dicomFiles.length > 0) {
          console.log(`Loaded ${dicomFiles.length} DICOM files`);
          setAllFiles(dicomFiles);
        } else {
          setError('No DICOM files found in this scan');
        }
      } catch (err) {
        console.error('Failed to load scan files:', err);
        setError(`Failed to load scan files: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllFiles();
  }, [client, config, experimentId, scanId]);

  // Load volume when initialized and files are available
  useEffect(() => {
    if (!isInitialized || allFiles.length === 0 || isLoading || volumeLoaded) {
      return;
    }

    const loadVolume = async () => {
      const debug: string[] = [];
      const addDebug = (msg: string) => {
        console.log(msg);
        debug.push(msg);
        setDebugInfo([...debug]);
      };

      // Wait a moment for DOM to be ready
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify refs are available
      if (!axialRef.current || !sagittalRef.current || !coronalRef.current) {
        console.error('Viewport elements not ready');
        setError('Viewport elements not ready');
        return;
      }

      setIsLoading(true);
      try {
        addDebug('Loading volume...');
        console.log('Viewport elements:', {
          axial: axialRef.current,
          sagittal: sagittalRef.current,
          coronal: coronalRef.current
        });

        // Fetch DICOM files and cache them
        const imageIds: string[] = [];

        for (let i = 0; i < allFiles.length; i++) {
          const fileName = allFiles[i];
          const url = `/api/xnat/data/archive/experiments/${experimentId}/scans/${scanId}/resources/DICOM/files/${fileName}`;

          const sessionId = config?.jsessionid ?? localStorage.getItem(STORAGE_KEYS.JSESSIONID);
          const headers: HeadersInit = sessionId ? { Cookie: `JSESSIONID=${sessionId}` } : {};

          const response = await fetch(url, {
            headers,
            credentials: 'include',
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch ${fileName}`);
          }

          const arrayBuffer = await response.arrayBuffer();

          // Store in cache for custom image loader and histogram calculation
          imageDataCache.current.set(fileName, arrayBuffer);

          // Use custom 'dicomfile:' scheme
          imageIds.push(`dicomfile:${fileName}`);
        }

        addDebug(`Created ${imageIds.length} image IDs for custom loader`);

        // Destroy existing rendering engine if present
        if (renderingEngineRef.current) {
          try {
            renderingEngineRef.current.destroy();
          } catch (e) {
            console.warn('Error destroying previous rendering engine:', e);
          }
        }

        // Create rendering engine
        const renderingEngineId = 'myRenderingEngine';
        const renderingEngine = new RenderingEngine(renderingEngineId);
        renderingEngineRef.current = renderingEngine;

        console.log('Setting up viewports...');

        // Create viewports with STACK type for simplicity
        const viewportInputs = [
          {
            viewportId: 'AXIAL',
            type: ViewportType.STACK,
            element: axialRef.current,
            defaultOptions: {
              background: [0, 0, 0] as [number, number, number],
            },
          },
          {
            viewportId: 'SAGITTAL',
            type: ViewportType.STACK,
            element: sagittalRef.current,
            defaultOptions: {
              background: [0, 0, 0] as [number, number, number],
            },
          },
          {
            viewportId: 'CORONAL',
            type: ViewportType.STACK,
            element: coronalRef.current,
            defaultOptions: {
              background: [0, 0, 0] as [number, number, number],
            },
          },
        ];

        try {
          addDebug('Calling setViewports...');
          renderingEngine.setViewports(viewportInputs);
          addDebug('Viewports created successfully');
        } catch (vpError) {
          const errorMsg = `Failed to create viewports: ${vpError instanceof Error ? vpError.message : String(vpError)}`;
          console.error(errorMsg, vpError);
          addDebug(errorMsg);
          throw vpError;
        }

        // Load stack into axial viewport
        const axialViewport = renderingEngine.getViewport('AXIAL') as any;
        addDebug(`Setting axial stack with ${imageIds.length} images`);
        await axialViewport.setStack(imageIds);
        addDebug(`Axial stack loaded, index: ${axialViewport.getCurrentImageIdIndex?.()}`);

        // Don't set VOI here - let Cornerstone use window/level from DICOM
        // This allows proper auto-windowing based on the actual pixel values
        addDebug('Axial viewport initialized, using DICOM window/level values');

        // For now, just load middle slice into other viewports
        const midIndex = Math.floor(imageIds.length / 2);
        const sagittalViewport = renderingEngine.getViewport('SAGITTAL') as any;
        addDebug('Setting sagittal stack with middle slice');
        await sagittalViewport.setStack([imageIds[midIndex]]);
        addDebug('Sagittal stack loaded');

        const coronalViewport = renderingEngine.getViewport('CORONAL') as any;
        addDebug('Setting coronal stack with middle slice');
        await coronalViewport.setStack([imageIds[midIndex]]);
        addDebug('Coronal stack loaded');

        // Log viewport info before rendering
        const viewports = renderingEngine.getViewports();
        viewports.forEach(v => {
          console.log(`Viewport ${v.id}:`, {
            element: v.element,
            elementWidth: v.element?.clientWidth,
            elementHeight: v.element?.clientHeight,
            canvas: v.canvas,
            canvasWidth: v.canvas?.width,
            canvasHeight: v.canvas?.height,
            hasCanvas: !!v.canvas,
            canvasInDom: v.canvas ? document.contains(v.canvas) : false
          });
        });

        // Resize viewports to ensure canvases have proper dimensions
        addDebug('Resizing viewports...');
        renderingEngine.resize(true);

        // Reset cameras before rendering
        viewports.forEach(vp => {
          addDebug(`Resetting camera for ${vp.id}`);
          if (vp.resetCamera) {
            vp.resetCamera();
          }
        });

        // Render all viewports
        addDebug('Rendering viewports...');
        renderingEngine.render();

        // Check if images are actually displayed
        viewports.forEach(vp => {
          const canvas = vp.canvas;
          if (canvas) {
            addDebug(`Canvas ${vp.id}: ${canvas.width}x${canvas.height}`);

            // Check if canvas has any non-black pixels
            const ctx = canvas.getContext('2d');
            if (ctx) {
              const imageData = ctx.getImageData(canvas.width / 2, canvas.height / 2, 1, 1);
              addDebug(`Center pixel ${vp.id}: R=${imageData.data[0]} G=${imageData.data[1]} B=${imageData.data[2]}`);
            }
          } else {
            addDebug(`No canvas for ${vp.id}!`);
          }
        });

        addDebug('Volume loaded and rendered!');

        // Set initial slice indices to middle slice
        setCurrentSliceIndex({
          AXIAL: midIndex,
          SAGITTAL: midIndex,
          CORONAL: midIndex
        });

        // Force multiple re-renders to ensure display
        setTimeout(() => {
          if (!renderingEngineRef.current) return;

          try {
            renderingEngine.resize(true);
            viewports.forEach(vp => {
              if (vp.resetCamera) vp.resetCamera();
            });
            renderingEngine.render();
            console.log('Re-render 1 completed');
          } catch (err) {
            console.warn('Failed delayed render 1:', err);
          }
        }, 100);

        setTimeout(() => {
          if (!renderingEngineRef.current) return;

          try {
            renderingEngine.render();
            console.log('Re-render 2 completed');
          } catch (err) {
            console.warn('Failed delayed render 2:', err);
          }
        }, 300);

        setVolumeLoaded(true);
        setError('');

        // Calculate initial histogram for middle slice
        updateHistogramForSlice(midIndex);
      } catch (err) {
        console.error('Failed to load volume:', err);
        setError(`Failed to load images: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadVolume();
  }, [isInitialized, allFiles, experimentId, scanId, config]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const resetViews = () => {
    if (!renderingEngineRef.current) return;
    const viewports = renderingEngineRef.current.getViewports();
    viewports.forEach((vp: any) => {
      if (vp.resetCamera) {
        vp.resetCamera();
      }
    });
    renderingEngineRef.current.render();
  };

  const applyWindowLevel = (center: number, width: number) => {
    if (!renderingEngineRef.current) return;

    const lower = center - width / 2;
    const upper = center + width / 2;

    console.log('Applying W/L:', { center, width, lower, upper });

    const viewports = renderingEngineRef.current.getViewports();
    viewports.forEach((vp: any) => {
      console.log(`Viewport ${vp.id}:`, {
        hasImage: !!vp.getImageData,
        canvas: vp.canvas,
        element: vp.element,
        canvasWidth: vp.canvas?.width,
        canvasHeight: vp.canvas?.height
      });

      if (vp.setProperties) {
        vp.setProperties({ voiRange: { lower, upper } });
      }

      // Force viewport render
      if (vp.render) {
        vp.render();
      }
    });
    renderingEngineRef.current.render();
    console.log('Viewports rendered with new W/L');

    // Update current stats to reflect new W/L
    if (currentImageStats) {
      setCurrentImageStats({
        ...currentImageStats,
        windowCenter: center,
        windowWidth: width
      });
    }
  };

  const applyWLPreset = (preset: string) => {
    if (!renderingEngineRef.current) return;

    const presets: Record<string, { center: number; width: number }> = {
      'default': { center: 31768, width: 63536 },
      'lung': { center: -600, width: 1500 },
      'bone': { center: 300, width: 1500 },
      'brain': { center: 40, width: 80 },
      'soft-tissue': { center: 40, width: 400 },
      'liver': { center: 80, width: 150 },
    };

    const wl = presets[preset] || presets['default'];
    setCurrentWLPreset(preset);

    applyWindowLevel(wl.center, wl.width);
  };

  const takeScreenshot = () => {
    if (!axialRef.current) return;
    const canvas = axialRef.current.querySelector('canvas');
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `screenshot-${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(url);
    });
  };

  const toggleMaximizeViewport = (viewportId: string) => {
    if (maximizedViewport === viewportId) {
      setMaximizedViewport(null);
    } else {
      setMaximizedViewport(viewportId);
    }

    // Resize rendering engine after layout change
    setTimeout(() => {
      if (renderingEngineRef.current) {
        try {
          renderingEngineRef.current.resize(true);

          // Reset cameras for visible viewports
          const viewports = renderingEngineRef.current.getViewports();
          viewports.forEach((vp: any) => {
            if (vp.element && vp.element.offsetWidth > 0 && vp.element.offsetHeight > 0) {
              if (vp.resetCamera) {
                vp.resetCamera();
              }
            }
          });

          renderingEngineRef.current.render();
        } catch (err) {
          console.warn('Error during viewport resize:', err);
        }
      }
    }, 100);
  };

  const calculateHistogram = (pixelData: Uint8Array | Uint16Array, numBins: number = 256) => {
    const bins: number[] = new Array(numBins).fill(0);
    let min = pixelData[0];
    let max = pixelData[0];
    let sum = 0;

    // Find min/max
    for (let i = 0; i < pixelData.length; i++) {
      const val = pixelData[i];
      if (val < min) min = val;
      if (val > max) max = val;
      sum += val;
    }

    const mean = sum / pixelData.length;
    const range = max - min;
    const binSize = range / numBins;

    // Calculate histogram
    for (let i = 0; i < pixelData.length; i++) {
      const binIndex = Math.min(Math.floor((pixelData[i] - min) / binSize), numBins - 1);
      bins[binIndex]++;
    }

    // Convert to array of objects
    const histogramData = bins.map((count, i) => ({
      value: min + (i * binSize),
      count
    }));

    return { histogramData, min, max, mean };
  };

  const updateHistogramForSlice = (sliceIndex: number) => {
    if (!allFiles[sliceIndex]) return;

    const fileName = allFiles[sliceIndex];
    const arrayBuffer = imageDataCache.current.get(fileName);
    if (!arrayBuffer) return;

    try {
      const byteArray = new Uint8Array(arrayBuffer);
      const dataSet = dicomParser.parseDicom(byteArray);

      const pixelDataElement = dataSet.elements.x7fe00010;
      if (!pixelDataElement) return;

      const bitsAllocated = dataSet.uint16('x00280100') || 8;
      const pixelDataOffset = pixelDataElement.dataOffset;
      const pixelDataLength = pixelDataElement.length;

      let pixelData;
      if (bitsAllocated === 8) {
        pixelData = new Uint8Array(arrayBuffer, pixelDataOffset, pixelDataLength);
      } else if (bitsAllocated === 16) {
        pixelData = new Uint16Array(arrayBuffer, pixelDataOffset, pixelDataLength / 2);
      } else {
        return;
      }

      const { histogramData, min, max, mean } = calculateHistogram(pixelData);

      const dicomWindowCenter = dataSet.floatString('x00281050');
      const dicomWindowWidth = dataSet.floatString('x00281051');

      setHistogram(histogramData);
      setCurrentImageStats({
        min,
        max,
        mean,
        windowCenter: dicomWindowCenter || (min + max) / 2,
        windowWidth: dicomWindowWidth || (max - min)
      });
    } catch (err) {
      console.error('Failed to calculate histogram:', err);
    }
  };

  const handleHistogramInteraction = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!currentImageStats || !histogramRef.current) return;

    const rect = histogramRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;

    // Convert x position to pixel value
    const pixelRange = currentImageStats.max - currentImageStats.min;
    const pixelValue = currentImageStats.min + (x / width) * pixelRange;

    // Calculate current window min/max pixel positions
    const wlMin = currentImageStats.windowCenter - currentImageStats.windowWidth / 2;
    const wlMax = currentImageStats.windowCenter + currentImageStats.windowWidth / 2;
    const wlMinX = ((wlMin - currentImageStats.min) / pixelRange) * width;
    const wlMaxX = ((wlMax - currentImageStats.min) / pixelRange) * width;

    const edgeThreshold = 10; // pixels

    if (e.type === 'mousedown') {
      // Check if clicking near an edge
      if (Math.abs(x - wlMinX) < edgeThreshold) {
        setIsDraggingHistogram('min');
      } else if (Math.abs(x - wlMaxX) < edgeThreshold) {
        setIsDraggingHistogram('max');
      } else {
        setIsDraggingHistogram('center');
        applyWindowLevel(pixelValue, currentImageStats.windowWidth);
      }
      setCurrentWLPreset('custom');
    } else if (e.type === 'mousemove') {
      if (isDraggingHistogram === 'min') {
        // Dragging min edge - adjust window width, keep max constant
        const newMin = pixelValue;
        const newWidth = wlMax - newMin;
        if (newWidth > 1) {
          const newCenter = newMin + newWidth / 2;
          applyWindowLevel(newCenter, newWidth);
        }
      } else if (isDraggingHistogram === 'max') {
        // Dragging max edge - adjust window width, keep min constant
        const newMax = pixelValue;
        const newWidth = newMax - wlMin;
        if (newWidth > 1) {
          const newCenter = wlMin + newWidth / 2;
          applyWindowLevel(newCenter, newWidth);
        }
      } else if (isDraggingHistogram === 'center') {
        applyWindowLevel(pixelValue, currentImageStats.windowWidth);
      } else {
        // Update hover state when not dragging
        if (Math.abs(x - wlMinX) < edgeThreshold) {
          setHoveredEdge('min');
        } else if (Math.abs(x - wlMaxX) < edgeThreshold) {
          setHoveredEdge('max');
        } else {
          setHoveredEdge(null);
        }
      }
    }
  };

  const handleHistogramMouseUp = () => {
    setIsDraggingHistogram(null);
  };

  const handleHistogramMouseLeave = () => {
    setIsDraggingHistogram(null);
    setHoveredEdge(null);
  };

  const handleHistogramWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    if (!currentImageStats) return;
    e.preventDefault();

    // Scroll to adjust window width
    const delta = e.deltaY;
    const widthChange = delta * (currentImageStats.max - currentImageStats.min) * 0.01;
    const newWidth = Math.max(1, currentImageStats.windowWidth + widthChange);

    applyWindowLevel(currentImageStats.windowCenter, newWidth);
    setCurrentWLPreset('custom');
  };

  const handleSliceChange = (viewportId: string, sliceIndex: number) => {
    if (!renderingEngineRef.current) return;

    // Only handle axial viewport which has the full stack
    if (viewportId !== 'AXIAL') return;

    setCurrentSliceIndex(prev => ({
      ...prev,
      [viewportId]: sliceIndex
    }));

    const viewport = renderingEngineRef.current.getViewport(viewportId) as any;
    if (viewport && viewport.setImageIdIndex) {
      try {
        viewport.setImageIdIndex(sliceIndex);
        renderingEngineRef.current.render();
        updateHistogramForSlice(sliceIndex);
      } catch (err) {
        console.warn('Error changing slice:', err);
      }
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-black' : 'h-[80vh] my-8'}`}>
      {/* Toolbar */}
      <div className="bg-gray-900 text-white p-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">MPR Viewer</h2>
          {allFiles.length > 0 && (
            <span className="text-xs text-gray-400">
              {allFiles.length} slices
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* W/L Presets */}
          <select
            value={currentWLPreset}
            onChange={(e) => applyWLPreset(e.target.value)}
            className="text-xs bg-gray-700 text-gray-300 rounded px-2 py-1 border border-gray-600 hover:bg-gray-600 transition-colors"
            disabled={!volumeLoaded}
            title="Window/Level Presets"
          >
            <option value="default">Auto</option>
            <option value="lung">Lung</option>
            <option value="bone">Bone</option>
            <option value="brain">Brain</option>
            <option value="soft-tissue">Soft Tissue</option>
            <option value="liver">Liver</option>
            <option value="custom">Custom</option>
          </select>

          {/* Reset Views */}
          <button
            onClick={resetViews}
            className="p-2 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
            title="Reset Views"
            disabled={!volumeLoaded}
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Link Viewports */}
          <button
            onClick={() => setViewportsLinked(!viewportsLinked)}
            className={`p-2 rounded transition-colors ${
              viewportsLinked
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
            title={viewportsLinked ? 'Unlink Viewports' : 'Link Viewports'}
            disabled={!volumeLoaded}
          >
            {viewportsLinked ? <Link className="w-4 h-4" /> : <Unlink className="w-4 h-4" />}
          </button>

          {/* Screenshot */}
          <button
            onClick={takeScreenshot}
            className="p-2 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
            title="Take Screenshot"
            disabled={!volumeLoaded}
          >
            <Camera className="w-4 h-4" />
          </button>

          {/* Metadata */}
          <button
            onClick={() => setShowMetadata(!showMetadata)}
            className={`p-2 rounded transition-colors ${
              showMetadata
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
            title="DICOM Metadata"
            disabled={!volumeLoaded}
          >
            <Info className="w-4 h-4" />
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Viewports - 3 panel layout */}
      <div className="flex-1 bg-black grid grid-cols-2 grid-rows-2 gap-1 p-1" style={{ minHeight: '500px' }}>
        {/* Axial - top left */}
        <div className={`relative bg-black border border-gray-700 rounded overflow-hidden flex flex-col ${
          maximizedViewport && maximizedViewport !== 'AXIAL' ? 'hidden' : ''
        } ${maximizedViewport === 'AXIAL' ? 'col-span-2 row-span-2' : ''}`}>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center text-white z-10 bg-black bg-opacity-50">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p>Loading volume...</p>
              </div>
            </div>
          )}
          <div className="absolute top-2 left-2 text-white text-sm font-semibold z-10 bg-black bg-opacity-50 px-2 py-1 rounded">
            Axial
          </div>
          <button
            onClick={() => toggleMaximizeViewport('AXIAL')}
            className="absolute top-2 right-2 z-10 p-1.5 rounded bg-black bg-opacity-50 hover:bg-opacity-70 text-white transition-colors"
            title={maximizedViewport === 'AXIAL' ? 'Restore' : 'Maximize'}
          >
            {maximizedViewport === 'AXIAL' ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <div ref={axialRef} className="flex-1" style={{ width: '100%', minHeight: '300px' }} />
          {volumeLoaded && allFiles.length > 1 && (
            <div className="bg-gray-900 px-2 py-1 flex items-center gap-2">
              <span className="text-xs text-gray-400 font-mono">{currentSliceIndex.AXIAL + 1}/{allFiles.length}</span>
              <input
                type="range"
                min="0"
                max={allFiles.length - 1}
                value={currentSliceIndex.AXIAL}
                onChange={(e) => handleSliceChange('AXIAL', parseInt(e.target.value))}
                className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
          )}
        </div>

        {/* Sagittal - top right */}
        <div className={`relative bg-black border border-gray-700 rounded overflow-hidden flex flex-col ${
          maximizedViewport && maximizedViewport !== 'SAGITTAL' ? 'hidden' : ''
        } ${maximizedViewport === 'SAGITTAL' ? 'col-span-2 row-span-2' : ''}`}>
          <div className="absolute top-2 left-2 text-white text-sm font-semibold z-10 bg-black bg-opacity-50 px-2 py-1 rounded">
            Sagittal
          </div>
          <button
            onClick={() => toggleMaximizeViewport('SAGITTAL')}
            className="absolute top-2 right-2 z-10 p-1.5 rounded bg-black bg-opacity-50 hover:bg-opacity-70 text-white transition-colors"
            title={maximizedViewport === 'SAGITTAL' ? 'Restore' : 'Maximize'}
          >
            {maximizedViewport === 'SAGITTAL' ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <div ref={sagittalRef} className="flex-1" style={{ width: '100%', minHeight: '300px' }} />
        </div>

        {/* Coronal - bottom left */}
        <div className={`relative bg-black border border-gray-700 rounded overflow-hidden flex flex-col ${
          maximizedViewport && maximizedViewport !== 'CORONAL' ? 'hidden' : ''
        } ${maximizedViewport === 'CORONAL' ? 'col-span-2 row-span-2' : ''}`}>
          <div className="absolute top-2 left-2 text-white text-sm font-semibold z-10 bg-black bg-opacity-50 px-2 py-1 rounded">
            Coronal
          </div>
          <button
            onClick={() => toggleMaximizeViewport('CORONAL')}
            className="absolute top-2 right-2 z-10 p-1.5 rounded bg-black bg-opacity-50 hover:bg-opacity-70 text-white transition-colors"
            title={maximizedViewport === 'CORONAL' ? 'Restore' : 'Maximize'}
          >
            {maximizedViewport === 'CORONAL' ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <div ref={coronalRef} className="flex-1" style={{ width: '100%', minHeight: '300px' }} />
        </div>

        {/* Info panel - bottom right */}
        <div className={`relative bg-gray-900 border border-gray-700 rounded overflow-hidden p-4 text-gray-300 text-sm overflow-y-auto ${
          maximizedViewport ? 'hidden' : ''
        }`}>
          <h3 className="text-white font-semibold mb-3 text-base">Volume Information</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Total Slices:</span>
              <span className="font-mono text-white">{allFiles.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Status:</span>
              <span className={volumeLoaded ? 'text-green-400' : 'text-yellow-400'}>
                {isLoading ? 'Loading...' : volumeLoaded ? 'Ready' : 'Waiting'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">W/L Preset:</span>
              <span className="text-white capitalize">{currentWLPreset}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Viewports:</span>
              <span className="text-white">{viewportsLinked ? 'Linked' : 'Independent'}</span>
            </div>
          </div>

          {/* Histogram */}
          {volumeLoaded && histogram.length > 0 && currentImageStats &&
           !isNaN(currentImageStats.min) && !isNaN(currentImageStats.max) &&
           !isNaN(currentImageStats.windowCenter) && !isNaN(currentImageStats.windowWidth) &&
           currentImageStats.max > currentImageStats.min && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <p className="text-gray-400 text-xs font-semibold mb-2">
                Pixel Histogram
                <span className="ml-2 text-gray-600 font-normal">(click/drag to adjust W/L)</span>
              </p>
              <div className="bg-gray-800 rounded p-2 mb-2">
                <svg
                  ref={histogramRef}
                  width="100%"
                  height="80"
                  viewBox="0 0 256 80"
                  preserveAspectRatio="none"
                  onMouseDown={handleHistogramInteraction}
                  onMouseMove={handleHistogramInteraction}
                  onMouseUp={handleHistogramMouseUp}
                  onMouseLeave={handleHistogramMouseLeave}
                  onWheel={handleHistogramWheel}
                  className={hoveredEdge ? 'cursor-ew-resize' : 'cursor-crosshair'}
                  style={{ userSelect: 'none' }}
                >
                  {(() => {
                    const maxCount = Math.max(...histogram.map(h => h.count));
                    const pixelRange = currentImageStats.max - currentImageStats.min;

                    // Calculate W/L range positions
                    const wlMin = currentImageStats.windowCenter - currentImageStats.windowWidth / 2;
                    const wlMax = currentImageStats.windowCenter + currentImageStats.windowWidth / 2;
                    const wlMinX = Math.max(0, Math.min(256, ((wlMin - currentImageStats.min) / pixelRange) * 256));
                    const wlMaxX = Math.max(0, Math.min(256, ((wlMax - currentImageStats.min) / pixelRange) * 256));
                    const wlCenterX = Math.max(0, Math.min(256, ((currentImageStats.windowCenter - currentImageStats.min) / pixelRange) * 256));

                    return (
                      <>
                        {/* Histogram bars */}
                        {histogram.map((bin, i) => {
                          const height = (bin.count / maxCount) * 70;
                          return (
                            <rect
                              key={i}
                              x={i}
                              y={80 - height}
                              width={1}
                              height={height}
                              fill="#60a5fa"
                              opacity={0.8}
                            />
                          );
                        })}

                        {/* W/L range overlay */}
                        <rect
                          x={Math.max(0, wlMinX)}
                          y={0}
                          width={Math.min(256, wlMaxX) - Math.max(0, wlMinX)}
                          height={80}
                          fill="yellow"
                          opacity={0.15}
                          pointerEvents="none"
                        />

                        {/* Window min line with handle */}
                        <line
                          x1={wlMinX}
                          y1={0}
                          x2={wlMinX}
                          y2={80}
                          stroke={hoveredEdge === 'min' || isDraggingHistogram === 'min' ? '#fbbf24' : '#fbbf24'}
                          strokeWidth={hoveredEdge === 'min' || isDraggingHistogram === 'min' ? 3 : 2}
                          opacity={hoveredEdge === 'min' || isDraggingHistogram === 'min' ? 1 : 0.7}
                          style={{ cursor: 'ew-resize' }}
                        />
                        {/* Min handle */}
                        <rect
                          x={wlMinX - 4}
                          y={36}
                          width={8}
                          height={8}
                          fill="#fbbf24"
                          stroke="#000"
                          strokeWidth={0.5}
                          opacity={hoveredEdge === 'min' || isDraggingHistogram === 'min' ? 1 : 0.8}
                          style={{ cursor: 'ew-resize' }}
                        />

                        {/* Window max line with handle */}
                        <line
                          x1={wlMaxX}
                          y1={0}
                          x2={wlMaxX}
                          y2={80}
                          stroke={hoveredEdge === 'max' || isDraggingHistogram === 'max' ? '#fbbf24' : '#fbbf24'}
                          strokeWidth={hoveredEdge === 'max' || isDraggingHistogram === 'max' ? 3 : 2}
                          opacity={hoveredEdge === 'max' || isDraggingHistogram === 'max' ? 1 : 0.7}
                          style={{ cursor: 'ew-resize' }}
                        />
                        {/* Max handle */}
                        <rect
                          x={wlMaxX - 4}
                          y={36}
                          width={8}
                          height={8}
                          fill="#fbbf24"
                          stroke="#000"
                          strokeWidth={0.5}
                          opacity={hoveredEdge === 'max' || isDraggingHistogram === 'max' ? 1 : 0.8}
                          style={{ cursor: 'ew-resize' }}
                        />

                        {/* Center line */}
                        <line
                          x1={wlCenterX}
                          y1={0}
                          x2={wlCenterX}
                          y2={80}
                          stroke="#f59e0b"
                          strokeWidth={1}
                          opacity={0.6}
                          pointerEvents="none"
                        />
                      </>
                    );
                  })()}
                </svg>
              </div>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <div>
                  <span className="text-gray-500">Min:</span>
                  <span className="text-white ml-1 font-mono">{currentImageStats.min.toFixed(0)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Max:</span>
                  <span className="text-white ml-1 font-mono">{currentImageStats.max.toFixed(0)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Mean:</span>
                  <span className="text-white ml-1 font-mono">{currentImageStats.mean.toFixed(1)}</span>
                </div>
                <div>
                  <span className="text-gray-500">W/L:</span>
                  <span className="text-white ml-1 font-mono">
                    {currentImageStats.windowCenter.toFixed(0)}/{currentImageStats.windowWidth.toFixed(0)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {volumeLoaded && (
            <>
              <div className="mt-4 pt-4 border-t border-gray-700">
                <p className="text-gray-400 text-xs font-semibold mb-2">Mouse Controls:</p>
                <ul className="text-xs space-y-1 text-gray-500">
                  <li>• <span className="text-gray-400">Left drag:</span> Window/Level</li>
                  <li>• <span className="text-gray-400">Right drag:</span> Pan</li>
                  <li>• <span className="text-gray-400">Scroll:</span> Navigate slices</li>
                  <li>• <span className="text-gray-400">Shift+Scroll:</span> Zoom</li>
                </ul>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-700">
                <p className="text-gray-400 text-xs font-semibold mb-2">Histogram Controls:</p>
                <ul className="text-xs space-y-1 text-gray-500">
                  <li>• <span className="text-gray-400">Drag edges:</span> Adjust window min/max</li>
                  <li>• <span className="text-gray-400">Click center:</span> Set window center</li>
                  <li>• <span className="text-gray-400">Scroll:</span> Adjust window width</li>
                </ul>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-700">
                <p className="text-gray-400 text-xs font-semibold mb-2">Toolbar:</p>
                <ul className="text-xs space-y-1 text-gray-500">
                  <li>• <span className="text-gray-400">W/L:</span> Window/Level presets</li>
                  <li>• <span className="text-gray-400">Reset:</span> Reset all views</li>
                  <li>• <span className="text-gray-400">Link:</span> Sync viewport scrolling</li>
                  <li>• <span className="text-gray-400">Camera:</span> Save screenshot</li>
                </ul>
              </div>
            </>
          )}

          {/* Debug Info */}
          {debugInfo.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <p className="text-gray-400 text-xs font-semibold mb-2">Debug Log:</p>
              <div className="text-xs space-y-1 text-gray-500 max-h-32 overflow-y-auto font-mono">
                {debugInfo.map((msg, i) => (
                  <div key={i}>• {msg}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status bar */}
      {volumeLoaded && (
        <div className="bg-gray-800 text-gray-300 px-4 py-2 text-xs">
          <div className="text-center">
            Multi-Viewport Mode • Axial view with stack scrolling
          </div>
        </div>
      )}
    </div>
  );
}

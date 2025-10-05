import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useXnat } from '../contexts/XnatContext';
import * as dicomParser from 'dicom-parser';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function SimpleDicomViewer() {
  const { client } = useXnat();
  const { experimentId, scanId } = useParams();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [allFiles, setAllFiles] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [imageCache, setImageCache] = useState<Map<number, ImageData>>(new Map());
  const [windowLevel, setWindowLevel] = useState({ center: 128, width: 256 });

  // Fetch file list
  useEffect(() => {
    if (!client || !experimentId || !scanId) return;

    const fetchFiles = async () => {
      try {
        const url = `/api/xnat/data/archive/experiments/${experimentId}/scans/${scanId}/resources/DICOM/files`;
        const response = await fetch(url, {
          headers: {
            'Cookie': `JSESSIONID=${localStorage.getItem('JSESSIONID')}`,
          },
        });

        if (!response.ok) throw new Error('Failed to fetch scan files');

        const data = await response.json();
        const files = data.ResultSet?.Result || [];
        const dicomFiles = files
          .filter((f: any) => f.Name?.toLowerCase().endsWith('.dcm'))
          .map((f: any) => f.Name)
          .sort();

        setAllFiles(dicomFiles);
      } catch (err) {
        setError(`Failed to load scan files: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    };

    fetchFiles();
  }, [client, experimentId, scanId]);

  // Load and render current image
  useEffect(() => {
    if (!allFiles[currentIndex] || !canvasRef.current) return;

    const loadImage = async () => {
      setIsLoading(true);
      try {
        // Check cache first
        if (imageCache.has(currentIndex)) {
          renderImage(imageCache.get(currentIndex)!);
          setIsLoading(false);
          return;
        }

        const fileName = allFiles[currentIndex];
        const url = `/api/xnat/data/archive/experiments/${experimentId}/scans/${scanId}/resources/DICOM/files/${fileName}`;

        const response = await fetch(url, {
          headers: {
            'Cookie': `JSESSIONID=${localStorage.getItem('JSESSIONID')}`,
          },
        });

        if (!response.ok) throw new Error(`Failed to fetch ${fileName}`);

        const arrayBuffer = await response.arrayBuffer();
        const byteArray = new Uint8Array(arrayBuffer);
        const dataSet = dicomParser.parseDicom(byteArray);

        // Extract pixel data
        const pixelDataElement = dataSet.elements.x7fe00010;
        if (!pixelDataElement) throw new Error('No pixel data found');

        const rows = dataSet.uint16('x00280010') || 512;
        const columns = dataSet.uint16('x00280011') || 512;
        const bitsAllocated = dataSet.uint16('x00280100') || 16;

        const pixelDataOffset = pixelDataElement.dataOffset;
        const pixelDataLength = pixelDataElement.length;

        let pixelData;
        if (bitsAllocated === 8) {
          pixelData = new Uint8Array(arrayBuffer, pixelDataOffset, pixelDataLength);
        } else {
          pixelData = new Uint16Array(arrayBuffer, pixelDataOffset, pixelDataLength / 2);
        }

        // Get window/level from DICOM or auto-calculate
        let wc = parseFloat(dataSet.string('x00281050') || '0');
        let ww = parseFloat(dataSet.string('x00281051') || '0');

        if (wc === 0 || ww === 0) {
          // Auto-calculate from pixel data
          let min = Infinity, max = -Infinity;
          for (let i = 0; i < pixelData.length; i++) {
            if (pixelData[i] < min) min = pixelData[i];
            if (pixelData[i] > max) max = pixelData[i];
          }
          wc = (min + max) / 2;
          ww = max - min;
        }

        setWindowLevel({ center: wc, width: ww });

        // Convert to 8-bit ImageData
        const imageData = new ImageData(columns, rows);
        const lower = wc - ww / 2;
        const upper = wc + ww / 2;
        const range = upper - lower;

        for (let i = 0; i < pixelData.length; i++) {
          const value = pixelData[i];
          let normalized = ((value - lower) / range) * 255;
          normalized = Math.max(0, Math.min(255, normalized));

          imageData.data[i * 4] = normalized;
          imageData.data[i * 4 + 1] = normalized;
          imageData.data[i * 4 + 2] = normalized;
          imageData.data[i * 4 + 3] = 255;
        }

        // Cache it
        const newCache = new Map(imageCache);
        newCache.set(currentIndex, imageData);
        setImageCache(newCache);

        renderImage(imageData);
      } catch (err) {
        setError(`Failed to load image: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadImage();
  }, [currentIndex, allFiles, experimentId, scanId]);

  const renderImage = (imageData: ImageData) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = imageData.width;
    canvas.height = imageData.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.putImageData(imageData, 0, 0);
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
    <div className="flex flex-col h-screen bg-black">
      <div className="bg-gray-900 text-white p-4">
        <h2 className="text-lg font-semibold">DICOM Viewer</h2>
        <p className="text-sm text-gray-400">
          Slice {currentIndex + 1} of {allFiles.length}
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        {isLoading && (
          <div className="text-white">Loading...</div>
        )}
        <canvas ref={canvasRef} className="max-w-full max-h-full" style={{ imageRendering: 'pixelated' }} />
      </div>

      <div className="bg-gray-900 p-4 flex items-center gap-4">
        <button
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
          className="p-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 rounded"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <input
          type="range"
          min="0"
          max={allFiles.length - 1}
          value={currentIndex}
          onChange={(e) => setCurrentIndex(parseInt(e.target.value))}
          className="flex-1"
        />

        <button
          onClick={() => setCurrentIndex(Math.min(allFiles.length - 1, currentIndex + 1))}
          disabled={currentIndex === allFiles.length - 1}
          className="p-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 rounded"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <div className="text-white text-sm">
          W/L: {windowLevel.center.toFixed(0)}/{windowLevel.width.toFixed(0)}
        </div>
      </div>
    </div>
  );
}

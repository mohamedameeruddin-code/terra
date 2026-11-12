import React, { useState, useRef, useEffect } from 'react';
import { Camera, Image as ImageIcon, Zap, AlertCircle, RefreshCw, Upload } from 'lucide-react';
import RoiSelector from '../components/RoiSelector';
import ProgressBar from '../components/ProgressBar';
import { loadAndNormalizeImage } from '../lib/analysis/preprocess';
import { renderAnalysisOverlay } from '../lib/analysis/overlay';
import { getSettings, saveAnalysis } from '../lib/db';
import ResultModal from './Result';

export default function Analyze() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [normalizedCanvas, setNormalizedCanvas] = useState(null);
  const [roi, setRoi] = useState(null);
  const [binLabel, setBinLabel] = useState('Bin #1');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState('PREPARING');
  const [errorMsg, setErrorMsg] = useState(null);
  const [resultData, setResultData] = useState(null);

  const fileInputCameraRef = useRef(null);
  const fileInputGalleryRef = useRef(null);
  const workerRef = useRef(null);

  // Initialize Web Worker
  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../workers/analysis.worker.js', import.meta.url),
      { type: 'module' }
    );

    getSettings().then((settings) => {
      if (settings.defaultBinLabel) setBinLabel(settings.defaultBinLabel);
    });

    return () => {
      if (workerRef.current) workerRef.current.terminate();
    };
  }, []);

  // Handle image selection
  const handleImageSelected = async (file) => {
    if (!file) return;
    setErrorMsg(null);
    setResultData(null);

    try {
      setSelectedFile(file);
      const { blob, width, height, canvas } = await loadAndNormalizeImage(file, 1024);
      setNormalizedCanvas(canvas);

      const objectUrl = URL.createObjectURL(blob);
      setImagePreview(objectUrl);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to decode or process selected image.');
    }
  };

  // Drag and drop handler
  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageSelected(e.dataTransfer.files[0]);
    }
  };

  // Run on-device analysis
  const handleRunAnalysis = async () => {
    if (!normalizedCanvas || !roi || isAnalyzing) return;

    setIsAnalyzing(true);
    setAnalysisStep('PREPARING');
    setErrorMsg(null);

    const settings = await getSettings();
    const ctx = normalizedCanvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, normalizedCanvas.width, normalizedCanvas.height);

    const worker = workerRef.current;
    if (!worker) {
      setErrorMsg('Analysis worker not initialized.');
      setIsAnalyzing(false);
      return;
    }

    worker.onmessage = async (e) => {
      const { type, step, result, error } = e.data;

      if (type === 'PROGRESS') {
        setAnalysisStep(step);
      } else if (type === 'SUCCESS') {
        const { fillPct, confidence, wasteLineY, status, durationMs } = result;

        // Render processed image with annotations
        const overlayCanvas = renderAnalysisOverlay(
          normalizedCanvas,
          roi,
          wasteLineY,
          fillPct,
          status,
          confidence
        );

        overlayCanvas.toBlob(async (processedBlob) => {
          normalizedCanvas.toBlob(async (originalBlob) => {
            const processedUrl = URL.createObjectURL(processedBlob);

            setResultData({
              binLabel,
              fillPct,
              confidence,
              status,
              wasteLineY,
              durationMs,
              roi,
              processedUrl,
              processedBlob,
              originalBlob,
              imageWidth: normalizedCanvas.width,
              imageHeight: normalizedCanvas.height,
            });

            setIsAnalyzing(false);
          }, 'image/jpeg', 0.88);
        }, 'image/jpeg', 0.90);
      } else if (type === 'ERROR') {
        setErrorMsg(error || 'Analysis encountered an error.');
        setIsAnalyzing(false);
      }
    };

    worker.postMessage({
      type: 'ANALYZE',
      imageData,
      roi,
      settings,
    });
  };

  // Preset test sample loader
  const loadTestSample = (sampleType) => {
    // Generate programmatic dustbin sample on a canvas
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = 600;
    sampleCanvas.height = 750;
    const ctx = sampleCanvas.getContext('2d');

    // Background wall/floor
    ctx.fillStyle = '#101713';
    ctx.fillRect(0, 0, 600, 750);

    // Dustbin cylinder
    ctx.fillStyle = '#17211B';
    ctx.strokeStyle = '#2E3E35';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(120, 150);
    ctx.lineTo(150, 650);
    ctx.lineTo(450, 650);
    ctx.lineTo(480, 150);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Bin Rim
    ctx.fillStyle = '#223029';
    ctx.fillRect(100, 130, 400, 30);

    // Fill level according to sampleType
    let fillHeight = 0;
    let label = 'Bin #1';
    if (sampleType === 'low') {
      fillHeight = 120; // 24%
      label = 'Bin Low (24%)';
    } else if (sampleType === 'medium') {
      fillHeight = 260; // 52%
      label = 'Bin Medium (52%)';
    } else if (sampleType === 'critical') {
      fillHeight = 460; // 92%
      label = 'Bin Critical (92%)';
    }

    if (fillHeight > 0) {
      // Draw waste texture
      const wasteY = 650 - fillHeight;
      for (let y = wasteY; y < 650; y += 4) {
        for (let x = 160; x < 440; x += 6) {
          const noise = Math.sin(x * 0.1) * Math.cos(y * 0.1) * 60;
          ctx.fillStyle = sampleType === 'critical'
            ? `rgb(${140 + noise}, ${60 + noise / 2}, ${40})`
            : `rgb(${70 + noise}, ${100 + noise}, ${60})`;
          ctx.fillRect(x, y, 6, 4);
        }
      }
    }

    sampleCanvas.toBlob(async (blob) => {
      setBinLabel(label);
      handleImageSelected(blob);
    }, 'image/jpeg', 0.9);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner */}
      <div>
        <h1 style={{ fontSize: '24px', marginBottom: '6px' }}>VISION AI FILL SCAN</h1>
        <p style={{ color: 'var(--lichen)', fontSize: '13px' }}>
          Capture or upload a dustbin image. All image processing runs 100% on-device in an offline Web Worker.
        </p>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div
          className="terra-card"
          style={{
            borderColor: 'var(--ember)',
            background: 'rgba(235, 90, 60, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <AlertCircle size={20} color="var(--ember)" />
          <span style={{ color: 'var(--ember)', fontSize: '13px', fontWeight: 600 }}>
            {errorMsg}
          </span>
        </div>
      )}

      {/* Hidden File Inputs */}
      <input
        ref={fileInputCameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => handleImageSelected(e.target.files[0])}
      />
      <input
        ref={fileInputGalleryRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => handleImageSelected(e.target.files[0])}
      />

      {/* Source Selection Buttons */}
      {!imagePreview ? (
        <div
          className="terra-card"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          style={{
            padding: '40px 20px',
            textAlign: 'center',
            borderStyle: 'dashed',
            borderWidth: '2px',
            borderColor: 'var(--line)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'var(--soil-800)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--line)',
            }}
          >
            <Camera size={32} color="var(--sprout)" />
          </div>

          <div>
            <h2 style={{ fontSize: '18px', marginBottom: '6px' }}>Input Dustbin Image</h2>
            <p style={{ color: 'var(--lichen)', fontSize: '13px', maxWidth: '360px' }}>
              Take a photo directly with your camera or select an existing photo from your gallery.
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              width: '100%',
              maxWidth: '320px',
            }}
          >
            <button
              type="button"
              className="btn-primary"
              onClick={() => fileInputCameraRef.current?.click()}
            >
              <Camera size={18} style={{ marginRight: '8px' }} />
              TAKE PHOTO
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => fileInputGalleryRef.current?.click()}
            >
              <ImageIcon size={18} style={{ marginRight: '8px' }} />
              CHOOSE FROM GALLERY
            </button>
          </div>

          {/* Quick Test Samples */}
          <div style={{ marginTop: '16px', borderTop: '1px solid var(--line)', paddingTop: '16px', width: '100%' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--lichen)', fontWeight: 600 }}>
              Or test with sample bins:
            </span>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => loadTestSample('low')}
                style={{ minHeight: '34px', height: '34px', fontSize: '12px' }}
              >
                Low Fill (24%)
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => loadTestSample('medium')}
                style={{ minHeight: '34px', height: '34px', fontSize: '12px' }}
              >
                Medium (52%)
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => loadTestSample('critical')}
                style={{ minHeight: '34px', height: '34px', fontSize: '12px' }}
              >
                Critical (92%)
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Image Loaded & ROI Calibration */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Bin Label & Action Toolbar */}
          <div className="terra-card" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: '1', minWidth: '180px' }}>
              <label className="terra-label">Dustbin Identifier</label>
              <input
                type="text"
                className="terra-input"
                value={binLabel}
                onChange={(e) => setBinLabel(e.target.value)}
                placeholder="e.g. Bin #4 - Cafeteria"
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => fileInputCameraRef.current?.click()}
                title="Retake photo"
              >
                <Camera size={16} />
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => fileInputGalleryRef.current?.click()}
                title="Pick another photo"
              >
                <Upload size={16} />
              </button>
            </div>
          </div>

          {/* Interactive ROI Selector Canvas */}
          <div className="terra-card">
            <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="terra-label" style={{ margin: 0 }}>
                Adjust Region of Interest (ROI)
              </span>
              <span style={{ fontSize: '11px', color: 'var(--lichen)' }}>
                Drag corner handles to align with the bin interior
              </span>
            </div>

            <RoiSelector
              imageSrc={imagePreview}
              initialRoi={roi}
              onRoiChange={(newRoi) => setRoi(newRoi)}
            />
          </div>

          {/* Analyzing Progress or Trigger Button */}
          {isAnalyzing ? (
            <div className="terra-card" style={{ padding: '20px' }}>
              <ProgressBar currentStep={analysisStep} />
            </div>
          ) : (
            <button
              type="button"
              className="btn-primary"
              onClick={handleRunAnalysis}
              style={{ width: '100%', minHeight: '52px', fontSize: '16px', letterSpacing: '0.05em' }}
            >
              <Zap size={20} style={{ marginRight: '8px' }} />
              ANALYSE DUSTBIN FILL LEVEL
            </button>
          )}
        </div>
      )}

      {/* Result Modal / Screen */}
      {resultData && (
        <ResultModal
          result={resultData}
          onRetake={() => setResultData(null)}
          onClose={() => setResultData(null)}
        />
      )}
    </div>
  );
}

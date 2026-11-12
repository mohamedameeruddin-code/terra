import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Camera,
  FileText,
  Download,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Info,
  RefreshCw,
  Eye,
  Sliders,
  Cpu,
} from 'lucide-react';
import FillGauge from '../components/FillGauge';
import StatusPill from '../components/StatusPill';
import RoiSelector from '../components/RoiSelector';
import {
  analyzeImage,
  getSampleImages,
  analyzeSampleImage,
} from '../api/client';

const ImageAnalysis = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [samples, setSamples] = useState([]);
  const [selectedSample, setSelectedSample] = useState(null);
  const [roiCoords, setRoiCoords] = useState(null);
  const [notes, setNotes] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('processed'); // 'processed' or 'original'

  const fileInputRef = useRef(null);

  useEffect(() => {
    getSampleImages()
      .then((data) => setSamples(data))
      .catch((err) => console.error('Failed to load sample images:', err));
  }, []);

  const handleFileSelect = (file) => {
    if (!file) return;
    const validExtensions = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validExtensions.includes(file.type)) {
      setError('Unsupported file type. Please upload a JPG or PNG image.');
      return;
    }
    setError(null);
    setSelectedFile(file);
    setSelectedSample(null);
    setResult(null);

    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSelectSample = (sample) => {
    setSelectedSample(sample);
    setSelectedFile(null);
    setPreviewUrl(sample.url);
    setResult(null);
    setError(null);
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError(null);
    try {
      if (selectedSample) {
        const res = await analyzeSampleImage(selectedSample.filename);
        setResult(res);
      } else if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        if (roiCoords) {
          formData.append('roi_json', JSON.stringify(roiCoords));
        }
        if (notes) {
          formData.append('notes', notes);
        }
        const res = await analyzeImage(formData);
        setResult(res);
      } else {
        setError('Please select or upload an image first.');
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Image processing failed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDownloadPdf = () => {
    if (result && result.id) {
      window.open(`/api/export/${result.id}`, '_blank');
    }
  };

  const mlBreakdown = result?.breakdown || {};

  return (
    <div className="page-container">
      {/* Title */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ marginBottom: '4px' }}>AI Vision Waste Fill Estimator</h1>
        <p style={{ color: 'var(--lichen)', fontSize: '15px' }}>
          Ensemble Artificial Intelligence pipeline: Classical CV Waterline Geometry + Trained ML Public Dustbin Model (Random Forest on 14 texture/color/edge features).
        </p>
      </div>

      {/* 1-Click Sample Test Suite Bar */}
      <div
        className="chamfer-card"
        style={{
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
          backgroundColor: 'var(--soil-950)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={16} style={{ color: 'var(--sprout)' }} />
          <span className="section-label" style={{ color: 'var(--bone)' }}>
            INSTANT TEST SUITE:
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {samples.map((s) => (
            <button
              key={s.filename}
              type="button"
              onClick={() => handleSelectSample(s)}
              className={`btn btn-sm ${
                selectedSample?.filename === s.filename ? 'btn-primary' : 'btn-ghost'
              }`}
              style={{ fontSize: '11px' }}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 1.2fr) minmax(320px, 1fr)',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        {/* Left Panel: Upload / Interactive ROI Canvas */}
        <div className="chamfer-card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '16px', marginBottom: '16px' }}>IMAGE ACQUISITION & ROI</h2>

          {!previewUrl ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed var(--line)',
                borderRadius: 'var(--radius)',
                padding: '48px 24px',
                textAlign: 'center',
                backgroundColor: 'var(--soil-950)',
                cursor: 'pointer',
                transition: 'border-color 160ms ease',
              }}
            >
              <Upload size={38} style={{ color: 'var(--sprout)', margin: '0 auto 16px auto' }} />
              <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--bone)', marginBottom: '4px' }}>
                Drag & drop dustbin photograph here
              </div>
              <div style={{ fontSize: '13px', color: 'var(--lichen)', marginBottom: '16px' }}>
                Supports JPG, JPEG, PNG (max 10 MB)
              </div>
              <button type="button" className="btn btn-ghost btn-sm">
                Browse Local File
              </button>
            </div>
          ) : (
            <div>
              {/* ROI Selector Canvas */}
              <RoiSelector
                imageSrc={previewUrl}
                onRoiChange={(roi) => setRoiCoords(roi)}
              />

              <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewUrl(null);
                    setSelectedFile(null);
                    setSelectedSample(null);
                    setResult(null);
                  }}
                  className="btn btn-ghost btn-sm"
                >
                  <RefreshCw size={13} />
                  <span>Choose Another Image</span>
                </button>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/jpg"
            style={{ display: 'none' }}
            onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
          />

          {/* Optional Operator Notes */}
          <div style={{ marginTop: '20px' }}>
            <label className="section-label" style={{ display: 'block', marginBottom: '6px' }}>
              OPERATOR LOG / CONTEXT NOTES
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Public sidewalk street bin, afternoon audit inspection"
              className="input"
            />
          </div>

          {/* Action Button */}
          <div style={{ marginTop: '20px' }}>
            <button
              onClick={handleAnalyze}
              disabled={!previewUrl || isAnalyzing}
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '14px' }}
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw size={16} className="spin" />
                  <span>RUNNING ENSEMBLE AI (CV + ML MODEL)...</span>
                </>
              ) : (
                <>
                  <Camera size={16} />
                  <span>RUN VISION FILL ESTIMATION</span>
                </>
              )}
            </button>
          </div>

          {error && (
            <div
              style={{
                marginTop: '16px',
                padding: '12px',
                borderRadius: 'var(--radius)',
                backgroundColor: 'rgba(235, 90, 60, 0.15)',
                border: '1px solid var(--ember)',
                color: 'var(--ember)',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Right Panel: Analysis Result */}
        <div className="chamfer-card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '16px', marginBottom: '16px' }}>ANALYSIS RESULTS & METRICS</h2>

          {result ? (
            <div>
              {/* Top View Toggle: Processed vs Original */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '14px',
                }}
              >
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => setViewMode('processed')}
                    className={`btn btn-sm ${viewMode === 'processed' ? 'btn-primary' : 'btn-ghost'}`}
                  >
                    Annotated CV Overlay
                  </button>
                  <button
                    onClick={() => setViewMode('original')}
                    className={`btn btn-sm ${viewMode === 'original' ? 'btn-primary' : 'btn-ghost'}`}
                  >
                    Original View
                  </button>
                </div>

                <StatusPill status={result.fill_status} />
              </div>

              {/* Display Result Image */}
              <div
                style={{
                  position: 'relative',
                  borderRadius: 'var(--radius)',
                  overflow: 'hidden',
                  border: '1px solid var(--line)',
                  background: 'var(--soil-950)',
                  marginBottom: '20px',
                }}
              >
                <img
                  src={viewMode === 'processed' ? result.processed_image_url : result.original_image_url}
                  alt="Analysis visual"
                  style={{ width: '100%', maxHeight: '360px', objectFit: 'contain', display: 'block' }}
                />
              </div>

              {/* Circular Gauge & Core Indicators */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px',
                  alignItems: 'center',
                  backgroundColor: 'var(--soil-950)',
                  padding: '16px',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--line)',
                  marginBottom: '16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <FillGauge
                    percentage={result.fill_percentage}
                    status={result.fill_status}
                    size={160}
                  />
                </div>

                <div>
                  <div className="section-label" style={{ marginBottom: '4px' }}>
                    ESTIMATED OCCUPANCY
                  </div>
                  <div className="mono-metric" style={{ fontSize: '34px', color: result.fill_status === 'Critical' ? 'var(--ember)' : 'var(--bone)' }}>
                    {result.fill_percentage?.toFixed(1)}%
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--lichen)', marginTop: '4px' }}>
                    Ensemble Confidence: <strong style={{ color: 'var(--sprout)' }}>{result.confidence_score?.toFixed(0)}%</strong>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--lichen)', marginTop: '2px' }}>
                    Waste Height: {result.detected_waste_height?.toFixed(0)} px / {result.usable_bin_height?.toFixed(0)} px
                  </div>
                </div>
              </div>

              {/* Trained ML Model Diagnostic Card */}
              {mlBreakdown.ml_predicted_class && (
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius)',
                    backgroundColor: 'var(--soil-950)',
                    border: '1px solid var(--line)',
                    marginBottom: '16px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span className="section-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Cpu size={12} style={{ color: 'var(--sprout)' }} />
                      TRAINED ML CLASSIFIER (PUBLIC BINS MODEL)
                    </span>
                    <span className="mono" style={{ fontSize: '12px', color: 'var(--sprout)', fontWeight: 600 }}>
                      PREDICTED: {mlBreakdown.ml_predicted_class?.toUpperCase()} ({mlBreakdown.ml_confidence?.toFixed(0)}%)
                    </span>
                  </div>

                  {mlBreakdown.is_top_overflow && (
                    <div style={{ fontSize: '12px', color: 'var(--ember)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>⚠️ Protruding garbage heap detected above dustbin rim. Overflow confirmed.</span>
                    </div>
                  )}
                </div>
              )}

              {/* Operational Recommendation Box */}
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: 'var(--radius)',
                  backgroundColor: result.fill_status === 'Critical' ? 'rgba(235, 90, 60, 0.12)' : 'rgba(184, 245, 60, 0.08)',
                  border: `1px solid ${result.fill_status === 'Critical' ? 'var(--ember)' : 'var(--sprout)'}`,
                  marginBottom: '20px',
                }}
              >
                <div className="section-label" style={{ color: result.fill_status === 'Critical' ? 'var(--ember)' : 'var(--sprout)', marginBottom: '4px' }}>
                  COLLECTION RECOMMENDATION
                </div>
                <div style={{ fontSize: '14px', color: 'var(--bone)', fontWeight: 500 }}>
                  {result.recommendation}
                </div>
              </div>

              {/* Action Buttons: Export PDF */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleDownloadPdf}
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  <Download size={15} />
                  <span>Download PDF Audit Report</span>
                </button>
              </div>

              {/* Technical Disclaimer */}
              <div
                style={{
                  marginTop: '16px',
                  fontSize: '11px',
                  color: 'var(--lichen)',
                  fontStyle: 'italic',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '6px',
                }}
              >
                <Info size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span>
                  Visual estimation only. Actual waste volume may vary based on container geometry, waste compactness, camera angle, and arrangement.
                </span>
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: '60px 20px',
                textAlign: 'center',
                color: 'var(--lichen)',
              }}
            >
              <Camera size={44} style={{ color: 'var(--soil-700)', margin: '0 auto 16px auto' }} />
              <div style={{ fontSize: '16px', color: 'var(--bone)', fontWeight: 600, marginBottom: '6px' }}>
                Awaiting Dustbin Photograph
              </div>
              <p style={{ fontSize: '13px', maxWidth: '340px', margin: '0 auto' }}>
                Select a test sample above or upload an image to run the Ensemble AI pipeline with the trained public dustbin classifier.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageAnalysis;

import fs from 'fs';
import { execSync } from 'child_process';
import dcmjs from 'dcmjs';
import { createCanvas } from 'canvas';

const { DicomMessage, DicomMetaDictionary } = dcmjs.data;

async function addTextToDicom() {
  console.log('Creating DICOM file with burned-in text...\n');

  // Extract test DICOM file
  console.log('Extracting test DICOM file...');
  execSync('cd /tmp && tar -xzf /Users/james/projects/data/test_dicom.tar.gz 2>/dev/null', { stdio: 'inherit' });

  const testDicomPath = '/tmp/Elder_subject_florbetapir/291467/scans/510007/DICOM/Generic_Study_ID.PT.Generic_Study_Description.510007.1.20120101.123408.19rsz4x.dcm';

  if (!fs.existsSync(testDicomPath)) {
    console.error('Test DICOM file not found');
    process.exit(1);
  }

  // Read the original DICOM file
  console.log('Reading DICOM file...');
  const arrayBuffer = fs.readFileSync(testDicomPath).buffer;
  const dicomDict = DicomMessage.readFile(arrayBuffer);
  const dataset = DicomMetaDictionary.naturalizeDataset(dicomDict.dict);

  console.log('Original DICOM info:');
  console.log(`  Rows: ${dataset.Rows}`);
  console.log(`  Columns: ${dataset.Columns}`);
  console.log(`  Patient Name: ${dataset.PatientName || 'N/A'}`);

  // Get pixel data
  const rows = dataset.Rows || 512;
  const cols = dataset.Columns || 512;
  const pixelData = new Uint8Array(dataset.PixelData);

  console.log(`\nPixel data size: ${pixelData.length} bytes`);

  // Create canvas and draw original image
  const canvas = createCanvas(cols, rows);
  const ctx = canvas.getContext('2d');

  // Draw original pixel data
  const imageData = ctx.createImageData(cols, rows);
  for (let i = 0; i < pixelData.length && i < rows * cols; i++) {
    const value = pixelData[i];
    imageData.data[i * 4] = value;     // R
    imageData.data[i * 4 + 1] = value; // G
    imageData.data[i * 4 + 2] = value; // B
    imageData.data[i * 4 + 3] = 255;   // A
  }
  ctx.putImageData(imageData, 0, 0);

  // Add text overlay (PHI-like information)
  ctx.fillStyle = 'white';
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 2;
  ctx.font = 'bold 16px Arial';

  const textLines = [
    'Patient: SMITH, JOHN',
    'DOB: 01/15/1965',
    'MRN: 123456789',
    'Study Date: 2024-10-03',
    'Institution: Memorial Hospital',
    'Physician: Dr. Jane Doe'
  ];

  textLines.forEach((text, index) => {
    const y = 20 + (index * 20);
    ctx.strokeText(text, 10, y);
    ctx.fillText(text, 10, y);
  });

  console.log('\nAdded text overlay with PHI:');
  textLines.forEach(line => console.log(`  ${line}`));

  // Get modified pixel data from canvas
  const modifiedImageData = ctx.getImageData(0, 0, cols, rows);
  const modifiedPixelData = new Uint8Array(rows * cols);

  // Convert back to grayscale
  for (let i = 0; i < rows * cols; i++) {
    modifiedPixelData[i] = modifiedImageData.data[i * 4]; // Use R channel
  }

  // Update the DICOM dataset with modified pixel data
  dicomDict.dict['7FE00010'].Value = [modifiedPixelData.buffer];

  // Write the modified DICOM file
  const outputPath = '/tmp/dicom_with_burned_in_text.dcm';
  const outputBuffer = dicomDict.write();
  fs.writeFileSync(outputPath, Buffer.from(outputBuffer));

  console.log(`\n✅ Created DICOM file with burned-in text: ${outputPath}`);
  console.log(`   File size: ${fs.statSync(outputPath).size} bytes`);

  // Also create a copy in the project directory for easy access
  const projectPath = '/Users/james/projects/data/dicom_with_burned_in_text.dcm';
  fs.copyFileSync(outputPath, projectPath);
  console.log(`   Copied to: ${projectPath}`);

  // Cleanup
  console.log('\nCleaning up...');
  execSync('rm -rf /tmp/Elder_subject_florbetapir');

  console.log('\n✅ Done! You can now test the OCR with this file.');
}

addTextToDicom().catch(error => {
  console.error('\n❌ ERROR:', error.message);
  console.error(error.stack);
  process.exit(1);
});

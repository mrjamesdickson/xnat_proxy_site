import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import dcmjs from 'dcmjs';
import { createCanvas } from 'canvas';

const { DicomMessage, DicomMetaDictionary } = dcmjs.data;

async function addTextToDicomFile(inputPath, outputPath, textLines) {
  // Read the original DICOM file
  const arrayBuffer = fs.readFileSync(inputPath).buffer;
  const dicomDict = DicomMessage.readFile(arrayBuffer);
  const dataset = DicomMetaDictionary.naturalizeDataset(dicomDict.dict);

  // Get pixel data
  const rows = dataset.Rows || 512;
  const cols = dataset.Columns || 512;
  const pixelData = new Uint8Array(dataset.PixelData);

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
  ctx.font = 'bold 14px Arial';

  textLines.forEach((text, index) => {
    const y = 18 + (index * 18);
    ctx.strokeText(text, 10, y);
    ctx.fillText(text, 10, y);
  });

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
  const outputBuffer = dicomDict.write();
  fs.writeFileSync(outputPath, Buffer.from(outputBuffer));

  return { rows, cols, textLines };
}

async function processDataset() {
  console.log('Adding burned-in text to test DICOM dataset...\n');

  // Extract test DICOM files
  const extractPath = '/tmp/dicom_test_with_text';
  console.log('Extracting test DICOM files...');
  execSync(`rm -rf ${extractPath}`, { stdio: 'ignore' });
  execSync(`mkdir -p ${extractPath}`, { stdio: 'ignore' });
  execSync(`cd ${extractPath} && tar -xzf /Users/james/projects/data/test_dicom.tar.gz 2>/dev/null`, { stdio: 'inherit' });

  // Find all DICOM files
  const dicomDir = path.join(extractPath, 'Elder_subject_florbetapir/291467/scans/510007/DICOM');

  if (!fs.existsSync(dicomDir)) {
    console.error('DICOM directory not found');
    process.exit(1);
  }

  const files = fs.readdirSync(dicomDir).filter(f => f.endsWith('.dcm'));
  console.log(`Found ${files.length} DICOM files\n`);

  // Different PHI text for different files
  const phiVariants = [
    [
      'Patient: SMITH, JOHN',
      'DOB: 01/15/1965',
      'MRN: 123456789',
      'Study Date: 2024-10-03'
    ],
    [
      'Institution: Memorial Hospital',
      'Physician: Dr. Jane Doe',
      'Phone: 555-123-4567',
      'SSN: 123-45-6789'
    ],
    [
      'Patient: JOHNSON, MARY',
      'Address: 123 Main St',
      'City: Springfield',
      'Insurance: BC/BS #9876'
    ],
    [
      'Emergency Contact: Bob Smith',
      'Contact Phone: 555-987-6543',
      'Referring MD: Dr. Sarah Lee',
      'Dept: Radiology'
    ]
  ];

  let processedCount = 0;

  // Process each DICOM file (add text to first 4 files)
  for (let i = 0; i < Math.min(files.length, 4); i++) {
    const fileName = files[i];
    const inputPath = path.join(dicomDir, fileName);
    const outputPath = inputPath; // Overwrite in place

    try {
      const result = await addTextToDicomFile(inputPath, outputPath, phiVariants[i]);
      console.log(`✅ File ${i + 1}/${Math.min(files.length, 4)}: ${fileName}`);
      console.log(`   Size: ${result.rows}x${result.cols}`);
      console.log(`   Added text:`);
      result.textLines.forEach(line => console.log(`     - ${line}`));
      console.log();
      processedCount++;
    } catch (error) {
      console.error(`❌ Failed to process ${fileName}:`, error.message);
    }
  }

  // Create new tar.gz with modified files
  const outputTarPath = '/Users/james/projects/data/test_dicom_with_burned_in_text.tar.gz';
  console.log('\nCreating new archive with burned-in text...');
  execSync(`cd ${extractPath} && tar -czf ${outputTarPath} Elder_subject_florbetapir`, { stdio: 'inherit' });

  console.log(`\n✅ Created: ${outputTarPath}`);
  console.log(`   Modified ${processedCount} DICOM files with burned-in PHI text`);

  // Cleanup
  console.log('\nCleaning up...');
  execSync(`rm -rf ${extractPath}`);

  console.log('\n✅ Done! You can now test the OCR with this dataset.');
  console.log('\nTo test:');
  console.log('1. Go to the Compressed Uploader');
  console.log('2. Select a project');
  console.log('3. Enable "Check for text in pixel data (OCR)"');
  console.log('4. Upload: /Users/james/projects/data/test_dicom_with_burned_in_text.tar.gz');
}

processDataset().catch(error => {
  console.error('\n❌ ERROR:', error.message);
  console.error(error.stack);
  process.exit(1);
});

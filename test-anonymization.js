import fs from 'fs';
import { dicomAnonymizer, DEFAULT_ANONYMIZATION_SCRIPT } from './src/services/dicom-anonymizer.ts';

async function testAnonymization() {
  console.log('Testing DICOM Anonymization...\n');

  // Extract a test DICOM file
  const { execSync } = await import('child_process');

  try {
    // Extract first DICOM file from tar.gz
    console.log('Extracting test DICOM file...');
    execSync('cd /tmp && tar -xzf /Users/james/projects/data/test_dicom.tar.gz 2>/dev/null', { stdio: 'inherit' });

    const testDicomPath = '/tmp/Elder_subject_florbetapir/291467/scans/510007/DICOM/Generic_Study_ID.PT.Generic_Study_Description.510007.1.20120101.123408.19rsz4x.dcm';

    if (!fs.existsSync(testDicomPath)) {
      console.error('Test DICOM file not found');
      process.exit(1);
    }

    // Read the file
    const buffer = fs.readFileSync(testDicomPath);
    const file = new File([buffer], 'test.dcm', { type: 'application/dicom' });

    console.log(`Test file size: ${buffer.length} bytes\n`);

    // Run anonymization
    console.log('Running anonymization with default script...');
    const result = await dicomAnonymizer.anonymizeFile(file, { script: DEFAULT_ANONYMIZATION_SCRIPT });

    console.log('\n=== ANONYMIZATION RESULTS ===');
    console.log(`Anonymized blob size: ${result.blob.size} bytes`);
    console.log(`Changes detected: ${result.changes.length}\n`);

    if (result.changes.length > 0) {
      console.log('✅ SUCCESS: Anonymization made changes');
      console.log('\nDetailed changes:');
      result.changes.forEach((change, i) => {
        console.log(`\n${i + 1}. ${change.tagName} ${change.tag}`);
        console.log(`   Original: "${change.originalValue}"`);
        console.log(`   New:      "${change.newValue}"`);
      });
    } else {
      console.log('❌ WARNING: No changes were detected!');
      console.log('This could mean:');
      console.log('  - The DICOM file has no PHI data in the expected tags');
      console.log('  - The anonymization script is not working correctly');
    }

    // Cleanup
    console.log('\n\nCleaning up...');
    execSync('rm -rf /tmp/Elder_subject_florbetapir');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testAnonymization();

// @ts-ignore - dicomedit doesn't have TypeScript definitions
import { Anonymizer } from 'dicomedit';
// @ts-ignore - dcmjs doesn't have TypeScript definitions
import * as dcmjs from 'dcmjs';
import { createWorker } from 'tesseract.js';

export interface AnonymizationChange {
  fileName: string;
  tag: string;
  tagName: string;
  originalValue: string;
  newValue: string;
}

export interface AnonymizationManifest {
  timestamp: string;
  totalFiles: number;
  changes: AnonymizationChange[];
  warnings: string[];
}

/**
 * Default anonymization script for removing patient identifying information
 * Based on DICOM PS3.15 Annex E - Basic Application Level Confidentiality Profile
 */
export const DEFAULT_ANONYMIZATION_SCRIPT = `
version "6.3"

// Patient Module - Remove identifying information
(0010,0030) := ""                    // Patient Birth Date
(0010,0032) := ""                    // Patient Birth Time
(0010,1000) := ""                    // Other Patient IDs
(0010,1001) := ""                    // Other Patient Names
(0010,1040) := ""                    // Patient Address
(0010,1060) := ""                    // Patient Mother's Birth Name
(0010,2154) := ""                    // Patient Telephone Numbers
(0010,2160) := ""                    // Patient Ethnic Group
(0010,21B0) := ""                    // Additional Patient History

// Institution Module - Remove identifying information
(0008,0080) := ""                    // Institution Name
(0008,0081) := ""                    // Institution Address
(0008,1040) := ""                    // Institutional Department Name
(0008,1070) := ""                    // Operators Name

// Physician Module - Remove identifying information
(0008,0090) := ""                    // Referring Physician Name
(0008,1048) := ""                    // Physician(s) of Record
(0008,1050) := ""                    // Performing Physician's Name
(0008,1060) := ""                    // Name of Physician(s) Reading Study
`;

export interface AnonymizationOptions {
  script?: string;
  patientId?: string;
  patientName?: string;
  enablePixelCheck?: boolean;
}

export class DicomAnonymizer {
  /**
   * Anonymizes a single DICOM file using dicomedit and tracks changes
   */
  async anonymizeFile(
    file: File,
    options?: AnonymizationOptions,
    onProgress?: (message: string) => void
  ): Promise<{ blob: Blob; changes: AnonymizationChange[]; warnings: string[] }> {
    const warnings: string[] = [];

    try {
      onProgress?.('Reading DICOM file...');

      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();

      onProgress?.('Preparing anonymization script...');

      // Parse original DICOM to capture original values
      const { DicomMessage } = dcmjs.data;
      const dicomDict = DicomMessage.readFile(arrayBuffer);
      const originalDataset = dcmjs.data.DicomMetaDictionary.naturalizeDataset(dicomDict.dict);

      // Use custom script or default
      let script = options?.script || DEFAULT_ANONYMIZATION_SCRIPT;

      // Apply custom patient name/ID if provided
      if (options?.patientName) {
        script = script.replace('(0010,0010) := "ANONYMOUS"', `(0010,0010) := "${options.patientName}"`);
      }
      if (options?.patientId) {
        script = script.replace('(0010,0020) := "ANON_ID"', `(0010,0020) := "${options.patientId}"`);
      }

      onProgress?.('Anonymizing DICOM data...');

      console.log('Input file size:', arrayBuffer.byteLength);
      console.log('Using script:', script);

      // Create anonymizer with script
      const anonymizer = new Anonymizer(script);

      // Load DICOM file
      anonymizer.loadDcm(arrayBuffer);

      // Apply anonymization rules
      await anonymizer.applyRules();

      onProgress?.('Writing anonymized DICOM...');

      // Get anonymized buffer
      const anonymizedBuffer = anonymizer.write();

      console.log('Output buffer size:', anonymizedBuffer.byteLength);

      // Parse anonymized DICOM to capture new values
      const anonymizedDict = DicomMessage.readFile(anonymizedBuffer);
      const anonymizedDataset = dcmjs.data.DicomMetaDictionary.naturalizeDataset(anonymizedDict.dict);

      // Track changes
      const changes = this.extractChanges(file.name, originalDataset, anonymizedDataset);

      // Convert to Blob
      const blob = new Blob([anonymizedBuffer], { type: 'application/dicom' });

      console.log('Output blob size:', blob.size);

      // Check for text in pixel data (if enabled)
      if (options?.enablePixelCheck) {
        onProgress?.('Checking for text in pixel data...');
        const hasText = await this.detectTextInPixels(blob, file.name);
        if (hasText) {
          warnings.push(`Text detected in pixel data of ${file.name} - may contain burned-in PHI`);
        }
      }

      onProgress?.('Anonymization complete');

      return { blob, changes, warnings };
    } catch (error) {
      console.error('Error anonymizing DICOM file:', error);
      throw new Error(`Failed to anonymize ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extracts changes between original and anonymized datasets
   */
  private extractChanges(
    fileName: string,
    original: any,
    anonymized: any
  ): AnonymizationChange[] {
    const changes: AnonymizationChange[] = [];

    // Instead of checking only hardcoded tags, check ALL tags in the datasets
    // to detect any changes made by the anonymization script
    const allKeys = new Set([
      ...Object.keys(original),
      ...Object.keys(anonymized)
    ]);

    // Known tag names for better reporting
    const tagNameMap: Record<string, string> = {
      '00100010': 'Patient Name',
      '00100020': 'Patient ID',
      '00100030': 'Patient Birth Date',
      '00100032': 'Patient Birth Time',
      '00101000': 'Other Patient IDs',
      '00101001': 'Other Patient Names',
      '00101040': 'Patient Address',
      '00101060': 'Patient Mother\'s Birth Name',
      '00102154': 'Patient Telephone Numbers',
      '00102160': 'Patient Ethnic Group',
      '001021B0': 'Additional Patient History',
      '00080080': 'Institution Name',
      '00080081': 'Institution Address',
      '00081040': 'Institutional Department Name',
      '00081070': 'Operators Name',
      '00080090': 'Referring Physician Name',
      '00081048': 'Physician(s) of Record',
      '00081050': 'Performing Physician\'s Name',
      '00081060': 'Name of Physician(s) Reading Study',
      '00120031': 'Clinical Trial Site ID',
      '00120010': 'Clinical Trial Sponsor Name',
      '00120020': 'Clinical Trial Protocol ID',
      '00120021': 'Clinical Trial Protocol Name',
      '00120030': 'Clinical Trial Site Name',
      '00120040': 'Clinical Trial Subject ID',
      '00120042': 'Clinical Trial Subject Reading ID',
      '00120050': 'Clinical Trial Time Point ID',
      '00120051': 'Clinical Trial Time Point Description',
    };

    // Check all tags for changes
    for (const key of allKeys) {
      const originalValue = this.getTagValue(original, key);
      const anonymizedValue = this.getTagValue(anonymized, key);

      if (originalValue !== anonymizedValue) {
        // Normalize tag format
        const normalizedTag = this.normalizeTag(key);

        // Get tag name - if not in map, convert camelCase key to readable format
        let tagName = tagNameMap[normalizedTag];
        if (!tagName) {
          // Convert camelCase to Title Case for display
          tagName = key
            .replace(/([A-Z])/g, ' $1')
            .trim()
            .replace(/^./, (str) => str.toUpperCase());
        }

        changes.push({
          fileName,
          tag: `(${normalizedTag.substring(0, 4)},${normalizedTag.substring(4)})`,
          tagName,
          originalValue: originalValue || '',
          newValue: anonymizedValue || '',
        });
      }
    }

    return changes;
  }

  /**
   * Normalize tag to 8-character uppercase hex format
   */
  private normalizeTag(tag: string): string {
    // Map naturalized dcmjs names back to hex tags
    const nameToHexMap: Record<string, string> = {
      'PatientName': '00100010',
      'PatientID': '00100020',
      'PatientBirthDate': '00100030',
      'PatientBirthTime': '00100032',
      'OtherPatientIDs': '00101000',
      'OtherPatientNames': '00101001',
      'PatientAddress': '00101040',
      'PatientMotherBirthName': '00101060',
      'PatientTelephoneNumbers': '00102154',
      'EthnicGroup': '00102160',
      'AdditionalPatientHistory': '001021B0',
      'InstitutionName': '00080080',
      'InstitutionAddress': '00080081',
      'InstitutionalDepartmentName': '00081040',
      'OperatorsName': '00081070',
      'ReferringPhysicianName': '00080090',
      'PhysiciansOfRecord': '00081048',
      'PerformingPhysicianName': '00081050',
      'NameOfPhysiciansReadingStudy': '00081060',
      'ClinicalTrialSiteID': '00120031',
      'ClinicalTrialSponsorName': '00120010',
      'ClinicalTrialProtocolID': '00120020',
      'ClinicalTrialProtocolName': '00120021',
      'ClinicalTrialSiteName': '00120030',
      'ClinicalTrialSubjectID': '00120040',
      'ClinicalTrialSubjectReadingID': '00120042',
      'ClinicalTrialTimePointID': '00120050',
      'ClinicalTrialTimePointDescription': '00120051',
    };

    // Check if it's a naturalized name
    if (nameToHexMap[tag]) {
      return nameToHexMap[tag];
    }

    // Remove any parentheses, commas, spaces
    const cleaned = tag.replace(/[(),\s]/g, '');
    // Check if it's already hex format
    if (/^[0-9A-Fa-f]{8}$/.test(cleaned)) {
      return cleaned.toUpperCase();
    }

    // Unknown format - return as is
    return tag;
  }

  /**
   * Gets a tag value from a dataset
   */
  private getTagValue(dataset: any, tag: string): string {
    // Try different field name formats
    const key = tag.replace(/^0+/, ''); // Remove leading zeros
    const value = dataset[tag] || dataset[key] || dataset[tag.toLowerCase()];

    if (value === undefined || value === null) return '';
    if (typeof value === 'string') return this.decodeText(value);
    if (typeof value === 'object' && value.Value) {
      const val = Array.isArray(value.Value) ? value.Value.join(', ') : String(value.Value);
      return this.decodeText(val);
    }
    return this.decodeText(String(value));
  }

  /**
   * Decodes text that may have encoding issues
   */
  private decodeText(text: string): string {
    try {
      // Check if the text looks like it has encoding issues (contains lots of special chars)
      // This often happens when UTF-8 bytes are interpreted as ASCII
      if (/[\x80-\xFF]/.test(text)) {
        // Try to re-encode as Latin1 then decode as UTF-8
        const bytes = new Uint8Array(text.length);
        for (let i = 0; i < text.length; i++) {
          bytes[i] = text.charCodeAt(i);
        }
        return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
      }
      return text;
    } catch (error) {
      // If decoding fails, return original text
      return text;
    }
  }

  /**
   * Detect text in DICOM pixel data using OCR
   */
  private async detectTextInPixels(dicomBlob: Blob, fileName: string): Promise<boolean> {
    try {
      // Read DICOM blob
      const arrayBuffer = await dicomBlob.arrayBuffer();
      const { DicomMessage } = dcmjs.data;
      const dicomDict = DicomMessage.readFile(arrayBuffer);
      const dataset = dcmjs.data.DicomMetaDictionary.naturalizeDataset(dicomDict.dict);

      // Check if pixel data exists
      if (!dataset.PixelData) {
        return false;
      }

      // Extract pixel data and create canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;

      // Get image dimensions
      const rows = dataset.Rows || 512;
      const cols = dataset.Columns || 512;
      canvas.width = cols;
      canvas.height = rows;

      // Create image data from pixel data
      const imageData = ctx.createImageData(cols, rows);
      const pixelData = new Uint8Array(dataset.PixelData);

      // Convert to grayscale RGBA (assuming 8-bit grayscale for simplicity)
      for (let i = 0; i < pixelData.length && i < rows * cols; i++) {
        const value = pixelData[i];
        imageData.data[i * 4] = value;     // R
        imageData.data[i * 4 + 1] = value; // G
        imageData.data[i * 4 + 2] = value; // B
        imageData.data[i * 4 + 3] = 255;   // A
      }

      ctx.putImageData(imageData, 0, 0);

      // Convert canvas to blob for OCR
      const imageBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create blob from canvas'));
        }, 'image/png');
      });

      // Run OCR
      const worker = await createWorker('eng');
      const { data } = await worker.recognize(imageBlob);
      await worker.terminate();

      // Check if any text was detected (with minimum confidence)
      const hasText = data.text.trim().length > 0 && data.confidence > 30;

      console.log(`OCR for ${fileName}: "${data.text.substring(0, 100)}" (confidence: ${data.confidence})`);

      return hasText;
    } catch (error) {
      console.warn(`Failed to check pixel data for ${fileName}:`, error);
      // Don't fail the whole process if OCR fails
      return false;
    }
  }

  /**
   * Anonymizes multiple DICOM files
   */
  async anonymizeFiles(
    files: File[],
    options?: AnonymizationOptions,
    onProgress?: (current: number, total: number, message: string) => void
  ): Promise<{ blobs: Blob[]; changes: AnonymizationChange[]; warnings: string[] }> {
    const anonymizedFiles: Blob[] = [];
    const allChanges: AnonymizationChange[] = [];
    const allWarnings: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      onProgress?.(i + 1, files.length, `Anonymizing ${file.name}...`);

      const result = await this.anonymizeFile(file, options, (msg) => {
        onProgress?.(i + 1, files.length, msg);
      });

      anonymizedFiles.push(result.blob);
      allChanges.push(...result.changes);
      allWarnings.push(...result.warnings);
    }

    return { blobs: anonymizedFiles, changes: allChanges, warnings: allWarnings };
  }

  /**
   * Parses and validates an anonymization script
   */
  validateScript(script: string): { valid: boolean; error?: string } {
    try {
      // Try to create an anonymizer with the script
      new Anonymizer(script);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid script syntax'
      };
    }
  }
}

// Singleton instance
export const dicomAnonymizer = new DicomAnonymizer();

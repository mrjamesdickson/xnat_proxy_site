// @ts-ignore - dicomedit doesn't have TypeScript definitions
import { Anonymizer } from 'dicomedit';

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
}

export class DicomAnonymizer {
  /**
   * Anonymizes a single DICOM file using dicomedit
   */
  async anonymizeFile(
    file: File,
    options?: AnonymizationOptions,
    onProgress?: (message: string) => void
  ): Promise<Blob> {
    try {
      onProgress?.('Reading DICOM file...');

      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();

      onProgress?.('Preparing anonymization script...');

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

      // Convert to Blob
      const blob = new Blob([anonymizedBuffer], { type: 'application/dicom' });

      console.log('Output blob size:', blob.size);

      onProgress?.('Anonymization complete');

      return blob;
    } catch (error) {
      console.error('Error anonymizing DICOM file:', error);
      throw new Error(`Failed to anonymize ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Anonymizes multiple DICOM files
   */
  async anonymizeFiles(
    files: File[],
    options?: AnonymizationOptions,
    onProgress?: (current: number, total: number, message: string) => void
  ): Promise<Blob[]> {
    const anonymizedFiles: Blob[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      onProgress?.(i + 1, files.length, `Anonymizing ${file.name}...`);

      const anonymizedBlob = await this.anonymizeFile(file, options, (msg) => {
        onProgress?.(i + 1, files.length, msg);
      });

      anonymizedFiles.push(anonymizedBlob);
    }

    return anonymizedFiles;
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

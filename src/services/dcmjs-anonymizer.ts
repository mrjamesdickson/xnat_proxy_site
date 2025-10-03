// @ts-ignore - dcmjs doesn't have TypeScript definitions
import * as dcmjs from 'dcmjs';

const { DicomMessage } = dcmjs.data;

export class DcmjsAnonymizer {
  /**
   * Parse a DicomEdit script and extract tag removal operations
   * This is a simplified parser that handles the most common operations
   */
  private parseScript(script: string): { removeTags: string[]; setTags: Map<string, string> } {
    const removeTags: string[] = [];
    const setTags = new Map<string, string>();

    const lines = script.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();

      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('version')) {
        continue;
      }

      // Match: - (0010,0030) // comment
      const removeMatch = trimmed.match(/^-\s*\(([0-9A-Fa-f]{4}),([0-9A-Fa-f]{4})\)/);
      if (removeMatch) {
        const tag = removeMatch[1] + removeMatch[2];
        removeTags.push(tag.toUpperCase());
        continue;
      }

      // Match: (0010,0030) := "value" or (0010,0030) := ""
      const setMatch = trimmed.match(/^\(([0-9A-Fa-f]{4}),([0-9A-Fa-f]{4})\)\s*:=\s*"([^"]*)"/);
      if (setMatch) {
        const tag = (setMatch[1] + setMatch[2]).toUpperCase();
        const value = setMatch[3];
        setTags.set(tag, value);
      }
    }

    return { removeTags, setTags };
  }

  async anonymizeFile(
    file: File,
    script?: string,
    onProgress?: (message: string) => void
  ): Promise<Blob> {
    try {
      onProgress?.('Reading DICOM file...');

      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();

      onProgress?.('Parsing DICOM data...');

      // Parse DICOM file
      let dicomData;
      try {
        dicomData = DicomMessage.readFile(arrayBuffer);
      } catch (error) {
        throw new Error(`Failed to parse DICOM file. It may not be a valid DICOM Part 10 file: ${error}`);
      }

      onProgress?.('Anonymizing patient data...');

      console.log('Input file size:', arrayBuffer.byteLength);

      // Parse the XNAT script if provided
      if (script) {
        console.log('Using XNAT script for anonymization');
        const { removeTags, setTags } = this.parseScript(script);

        console.log(`Parsed script: ${removeTags.length} tags to remove, ${setTags.size} tags to set`);

        // Apply removals
        for (const tag of removeTags) {
          if (dicomData.dict[tag]) {
            delete dicomData.dict[tag];
          }
        }

        // Apply assignments
        for (const [tag, value] of setTags.entries()) {
          if (dicomData.dict[tag]) {
            if (value === '') {
              // Empty value means delete
              delete dicomData.dict[tag];
            } else {
              // Set new value
              dicomData.dict[tag].Value = [value];
            }
          }
        }
      } else {
        // Fallback: use default removal list
        console.log('No script provided, using default anonymization');
        const fieldsToRemove = [
          '00100030', '00100032', '00100021', '00100050', '00100101',
          '00101000', '00101001', '00101002', '00101005', '00101010',
          '00101040', '00101060', '00101080', '00101081', '00101090',
          '00102000', '00102110', '00102150', '00102152', '00102154',
          '00102160', '00102180', '001021A0', '001021B0', '001021C0',
          '001021D0', '001021F0', '00102203', '00102297', '00102298',
          '00102299', '00080050', '00080080', '00080081', '00081040',
          '00081070', '00080090', '00081048', '00081050', '00081060',
        ];

        for (const tag of fieldsToRemove) {
          if (dicomData.dict[tag]) {
            delete dicomData.dict[tag];
          }
        }
      }

      onProgress?.('Writing anonymized DICOM...');

      // Write back to buffer
      const outputBuffer = dicomData.write();

      console.log('Output file size:', outputBuffer.byteLength);
      console.log('Size ratio:', (outputBuffer.byteLength / arrayBuffer.byteLength * 100).toFixed(1) + '%');

      // Convert to Blob
      const blob = new Blob([outputBuffer], { type: 'application/dicom' });

      onProgress?.('Anonymization complete');

      return blob;
    } catch (error) {
      console.error('Error anonymizing DICOM file:', error);
      throw error;
    }
  }

  async anonymizeFiles(
    files: File[],
    onProgress?: (current: number, total: number, message: string) => void
  ): Promise<Blob[]> {
    const anonymizedFiles: Blob[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      onProgress?.(i + 1, files.length, `Anonymizing ${file.name}...`);

      const anonymizedBlob = await this.anonymizeFile(file, (msg) => {
        onProgress?.(i + 1, files.length, msg);
      });

      anonymizedFiles.push(anonymizedBlob);
    }

    return anonymizedFiles;
  }
}

// Singleton instance
export const dcmjsAnonymizer = new DcmjsAnonymizer();

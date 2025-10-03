# Basic DICOM anonymization script for testing
# This removes common PHI fields

# Remove patient identifying information
(0010,0010) := ""  # Patient Name
(0010,0020) := "ANON"  # Patient ID
(0010,0030) := ""  # Patient Birth Date
(0010,0032) := ""  # Patient Birth Time
(0010,0040) := ""  # Patient Sex
(0010,1000) := ""  # Other Patient IDs
(0010,1001) := ""  # Other Patient Names
(0010,1040) := ""  # Patient Address
(0010,1060) := ""  # Patient Mother's Birth Name
(0010,2154) := ""  # Patient Telephone Numbers
(0010,2160) := ""  # Patient Ethnic Group
(0010,21B0) := ""  # Additional Patient History

# Remove institution information
(0008,0080) := ""  # Institution Name
(0008,0081) := ""  # Institution Address
(0008,1040) := ""  # Institutional Department Name
(0008,1070) := ""  # Operators Name

# Remove physician information
(0008,0090) := ""  # Referring Physician Name
(0008,1048) := ""  # Physician(s) of Record
(0008,1050) := ""  # Performing Physician's Name
(0008,1060) := ""  # Name of Physician(s) Reading Study

# Remove dates (optional - uncomment to enable)
# (0008,0020) := ""  # Study Date
# (0008,0021) := ""  # Series Date
# (0008,0022) := ""  # Acquisition Date
# (0008,0023) := ""  # Content Date

# Remove times (optional - uncomment to enable)
# (0008,0030) := ""  # Study Time
# (0008,0031) := ""  # Series Time
# (0008,0032) := ""  # Acquisition Time
# (0008,0033) := ""  # Content Time

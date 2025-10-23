#!/usr/bin/env python3
"""
Find a scan with fewer DICOM files for faster testing
"""
import requests

xnat_server = 'http://demo02.xnatworks.io'
username = 'admin'
password = 'admin'

print("Finding a smaller scan for testing...\n")

# Login
session = requests.Session()
login_url = f'{xnat_server}/data/JSESSION'
response = session.post(login_url, auth=(username, password))

if response.status_code != 200:
    print(f"Login failed: {response.status_code}")
    exit(1)

jsessionid = response.text.strip()
print(f"✓ Logged in (JSESSIONID: {jsessionid[:20]}...)\n")

# Get projects
projects_url = f'{xnat_server}/data/archive/projects'
response = session.get(projects_url, params={'format': 'json'})
projects = response.json().get('ResultSet', {}).get('Result', [])

print(f"Searching {len(projects)} projects for small scans...\n")

scans_found = []

for proj in projects[:15]:  # Check first 15 projects
    proj_id = proj.get('ID')

    # Get experiments
    experiments_url = f'{xnat_server}/data/archive/projects/{proj_id}/experiments'
    exp_response = session.get(experiments_url, params={'format': 'json'})

    if exp_response.status_code != 200:
        continue

    experiments = exp_response.json().get('ResultSet', {}).get('Result', [])

    for exp in experiments[:3]:  # Check first 3 experiments per project
        exp_id = exp.get('ID')

        # Get scans
        scans_url = f'{xnat_server}/data/archive/experiments/{exp_id}/scans'
        scans_response = session.get(scans_url, params={'format': 'json'})

        if scans_response.status_code != 200:
            continue

        scans = scans_response.json().get('ResultSet', {}).get('Result', [])

        for scan in scans:
            scan_id = scan.get('ID')

            # Get files for this scan
            files_url = f'{xnat_server}/data/archive/experiments/{exp_id}/scans/{scan_id}/resources/DICOM/files'
            files_response = session.get(files_url, params={'format': 'json'})

            if files_response.status_code == 200:
                files_data = files_response.json()
                files = files_data.get('ResultSet', {}).get('Result', [])
                dicom_files = [f for f in files if f.get('Name', '').lower().endswith('.dcm')]

                if len(dicom_files) > 0:
                    scans_found.append({
                        'project': proj_id,
                        'experiment': exp_id,
                        'scan': scan_id,
                        'files': len(dicom_files)
                    })

# Sort by number of files
scans_found.sort(key=lambda x: x['files'])

print("=" * 70)
print("FOUND SCANS (sorted by size)")
print("=" * 70)

for i, scan_info in enumerate(scans_found[:10], 1):
    url = f"http://localhost:5173/experiments/{scan_info['experiment']}/scans/{scan_info['scan']}/cornerstone"
    print(f"{i}. {scan_info['files']} files - Project: {scan_info['project']}")
    print(f"   Experiment: {scan_info['experiment']}, Scan: {scan_info['scan']}")
    print(f"   URL: {url}\n")

if scans_found:
    smallest = scans_found[0]
    print("=" * 70)
    print(f"RECOMMENDED: Use scan with {smallest['files']} files")
    print(f"URL: http://localhost:5173/experiments/{smallest['experiment']}/scans/{smallest['scan']}/cornerstone")
    print("=" * 70)

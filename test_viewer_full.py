#!/usr/bin/env python3
"""
Full test of Cornerstone DICOM viewer with real XNAT authentication
"""
import time
import json
import requests
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager

def test_with_real_auth():
    # XNAT server details
    xnat_server = 'http://demo02.xnatworks.io'
    username = 'admin'
    password = 'admin'

    print("=" * 60)
    print("Testing Cornerstone DICOM Viewer with Real XNAT Authentication")
    print("=" * 60)

    # Step 1: Login via XNAT API to get JSESSIONID
    print("\n[1/5] Logging into XNAT server via API...")
    session = requests.Session()

    try:
        # Login to XNAT
        login_url = f'{xnat_server}/data/JSESSION'
        response = session.post(
            login_url,
            auth=(username, password),
            headers={'Content-Type': 'application/x-www-form-urlencoded'}
        )

        if response.status_code == 200:
            jsessionid = response.text.strip()
            print(f"✅ Login successful! JSESSIONID: {jsessionid[:20]}...")
        else:
            print(f"❌ Login failed: {response.status_code}")
            return

    except Exception as e:
        print(f"❌ Error logging in: {e}")
        return

    # Step 2: Get list of projects and find one with experiments/scans
    print("\n[2/5] Fetching projects and searching for DICOM data...")
    try:
        projects_url = f'{xnat_server}/data/archive/projects'
        response = session.get(projects_url, params={'format': 'json'})

        if response.status_code != 200:
            print(f"❌ Failed to fetch projects: {response.status_code}")
            return

        data = response.json()
        projects = data.get('ResultSet', {}).get('Result', [])
        print(f"✅ Found {len(projects)} projects")

        if not projects:
            print("❌ No projects found")
            return

        # Search through projects for one with scans
        experiment_id = None
        scan_id = None
        project_id = None

        print("   Searching for experiments with scans...")

        for proj in projects[:10]:  # Check first 10 projects
            proj_id = proj.get('ID')
            print(f"   - Checking project: {proj_id}")

            # Get experiments for this project
            experiments_url = f'{xnat_server}/data/archive/projects/{proj_id}/experiments'
            exp_response = session.get(experiments_url, params={'format': 'json'})

            if exp_response.status_code != 200:
                continue

            exp_data = exp_response.json()
            experiments = exp_data.get('ResultSet', {}).get('Result', [])

            if not experiments:
                continue

            # Check first few experiments for scans
            for exp in experiments[:3]:
                exp_id = exp.get('ID')
                scans_url = f'{xnat_server}/data/archive/experiments/{exp_id}/scans'
                scans_response = session.get(scans_url, params={'format': 'json'})

                if scans_response.status_code == 200:
                    scans_data = scans_response.json()
                    scans = scans_data.get('ResultSet', {}).get('Result', [])

                    if scans:
                        project_id = proj_id
                        experiment_id = exp_id
                        scan_id = scans[0].get('ID')
                        print(f"   ✅ Found data!")
                        print(f"      Project: {project_id}")
                        print(f"      Experiment: {experiment_id}")
                        print(f"      Scan: {scan_id}")
                        break

            if experiment_id:
                break

        if not experiment_id or not scan_id:
            print("❌ No experiments with scans found in first 10 projects")
            return

    except Exception as e:
        print(f"❌ Error searching for data: {e}")
        return

    # Step 3: Launch browser and test viewer
    print("\n[3/4] Launching browser and loading Cornerstone viewer...")

    chrome_options = Options()
    chrome_options.add_argument('--headless')
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--window-size=1920,1080')
    chrome_options.set_capability('goog:loggingPrefs', {'browser': 'ALL'})

    driver = webdriver.Chrome(
        service=Service(ChromeDriverManager().install()),
        options=chrome_options
    )

    try:
        # Navigate to app
        driver.get('http://localhost:5173')
        time.sleep(2)

        # Inject JSESSIONID into browser
        print("   Injecting JSESSIONID into browser...")
        driver.add_cookie({
            'name': 'JSESSIONID',
            'value': jsessionid,
            'domain': 'localhost',
            'path': '/'
        })

        # Also store in localStorage for the app
        driver.execute_script(f"localStorage.setItem('JSESSIONID', '{jsessionid}');")
        driver.execute_script(f"localStorage.setItem('xnatServerUrl', '{xnat_server}');")

        print("   ✅ Session injected")

        # Navigate directly to the Cornerstone viewer
        viewer_url = f'http://localhost:5173/experiments/{experiment_id}/scans/{scan_id}/cornerstone'
        print(f"   Navigating to: {viewer_url}")
        driver.get(viewer_url)

        # Wait for viewer to load
        time.sleep(5)

        # Take screenshot
        driver.save_screenshot('/tmp/cornerstone_viewer.png')
        print("   ✅ Screenshot saved to /tmp/cornerstone_viewer.png")

        # Step 4: Check console for errors
        print("\n[4/4] Checking browser console...")
        logs = driver.get_log('browser')

        errors = [log for log in logs if log['level'] == 'SEVERE']
        warnings = [log for log in logs if log['level'] == 'WARNING']

        if errors:
            print(f"   ⚠️  Found {len(errors)} errors:")
            for error in errors[:5]:  # Show first 5
                msg = error['message'][:150]
                print(f"      - {msg}")
        else:
            print("   ✅ No severe errors!")

        if warnings:
            print(f"   ℹ️  Found {len(warnings)} warnings (this is normal)")

        # Check page content
        page_text = driver.find_element(By.TAG_NAME, 'body').text

        if 'MPR Viewer' in page_text:
            print("\n✅ SUCCESS: Cornerstone viewer loaded!")
        elif 'Loading' in page_text:
            print("\n⏳ Viewer is loading...")
        elif 'Sign in' in page_text:
            print("\n❌ Still on login page - session not working")
        else:
            print(f"\n❓ Unknown state. Page text: {page_text[:200]}")

    finally:
        driver.quit()
        print("\n" + "=" * 60)
        print("Test complete! Check /tmp/cornerstone_viewer.png")
        print("=" * 60)

if __name__ == '__main__':
    test_with_real_auth()

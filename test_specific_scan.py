#!/usr/bin/env python3
"""
Test specific Cornerstone viewer URL
"""
import time
import requests
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager

# XNAT server details
xnat_server = 'http://demo02.xnatworks.io'
username = 'admin'
password = 'admin'

# Specific scan URL provided by user
viewer_url = 'http://localhost:5173/experiments/XNAT_E00041/scans/2/cornerstone'

print("=" * 70)
print("Testing Cornerstone Viewer with Specific Scan")
print("=" * 70)
print(f"\nScan URL: {viewer_url}")

# Login to XNAT to get JSESSIONID
print("\n[1/3] Getting XNAT session...")
session = requests.Session()
login_url = f'{xnat_server}/data/JSESSION'
response = session.post(login_url, auth=(username, password))

if response.status_code != 200:
    print(f"❌ Login failed: {response.status_code}")
    exit(1)

jsessionid = response.text.strip()
print(f"✅ JSESSIONID: {jsessionid[:30]}...")

# Launch browser
print("\n[2/3] Loading Cornerstone viewer...")
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
    # Go to app first
    driver.get('http://localhost:5173')
    time.sleep(1)

    # Inject authentication
    driver.add_cookie({
        'name': 'JSESSIONID',
        'value': jsessionid,
        'domain': 'localhost',
        'path': '/'
    })
    driver.execute_script(f"localStorage.setItem('JSESSIONID', '{jsessionid}');")
    driver.execute_script(f"localStorage.setItem('xnatServerUrl', '{xnat_server}');")

    # Navigate to viewer
    print(f"   Loading: {viewer_url}")
    driver.get(viewer_url)

    # Wait for viewer to initialize
    print("   Waiting for viewer to load (10 seconds)...")
    time.sleep(10)

    # Take screenshot
    driver.save_screenshot('/tmp/cornerstone_test.png')
    print("   ✅ Screenshot: /tmp/cornerstone_test.png")

    # Check console
    print("\n[3/3] Analyzing results...")
    logs = driver.get_log('browser')

    # Filter logs
    errors = []
    infos = []
    for log in logs:
        msg = log['message']
        if log['level'] == 'SEVERE':
            errors.append(msg)
        elif 'Initializing' in msg or 'Loading' in msg or 'loaded' in msg:
            infos.append(msg)

    # Display key info logs
    if infos:
        print("\n📋 Key Info Logs:")
        for info in infos[:10]:
            # Clean up the message
            clean_msg = info.split(' ')[-1] if ' ' in info else info
            clean_msg = clean_msg.replace('"', '').strip()
            if clean_msg:
                print(f"   • {clean_msg}")

    # Display errors
    if errors:
        print(f"\n❌ Found {len(errors)} errors:")
        for error in errors[:5]:
            # Extract the meaningful part
            if 'http' in error:
                parts = error.split(' ')
                url_part = [p for p in parts if p.startswith('http')][0] if any(p.startswith('http') for p in parts) else error
                rest = ' '.join([p for p in parts if not p.startswith('http')])
                print(f"   • {rest}")
                print(f"     URL: {url_part[:80]}...")
            else:
                print(f"   • {error[:150]}")
    else:
        print("\n✅ No JavaScript errors!")

    # Check page content
    page_text = driver.find_element(By.TAG_NAME, 'body').text

    print("\n📄 Page Content Analysis:")
    if 'MPR Viewer' in page_text:
        print("   ✅ MPR Viewer detected")
    if 'Axial' in page_text:
        print("   ✅ Axial viewport present")
    if 'Sagittal' in page_text:
        print("   ✅ Sagittal viewport present")
    if 'Coronal' in page_text:
        print("   ✅ Coronal viewport present")
    if 'Loading volume' in page_text:
        print("   ⏳ Volume is loading...")
    if 'Volume loaded' in page_text:
        print("   ✅ Volume loaded successfully!")
    if 'Failed' in page_text or 'Error' in page_text:
        print(f"   ⚠️  Error message in UI: {page_text[:200]}")
    if 'Sign in' in page_text:
        print("   ❌ Still showing login page")

    # Summary
    print("\n" + "=" * 70)
    if not errors and 'MPR Viewer' in page_text:
        print("✅ SUCCESS: Cornerstone viewer appears to be working!")
    elif errors:
        print("⚠️  Viewer loaded but with errors - check screenshot")
    else:
        print("❓ Unknown state - check screenshot")
    print("=" * 70)

finally:
    driver.quit()

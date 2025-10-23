#!/usr/bin/env python3
"""
Test script for Cornerstone DICOM viewer
"""
import time
import json
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager

def capture_console_logs(driver):
    """Capture browser console logs"""
    logs = driver.get_log('browser')
    return logs

def test_viewer():
    # Set up Chrome options
    chrome_options = Options()
    chrome_options.add_argument('--headless')  # Run in background
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--window-size=1920,1080')
    chrome_options.set_capability('goog:loggingPrefs', {'browser': 'ALL'})

    # Initialize driver
    print("Initializing Chrome driver...")
    driver = webdriver.Chrome(
        service=Service(ChromeDriverManager().install()),
        options=chrome_options
    )

    try:
        # Navigate to app
        print("Navigating to http://localhost:5173...")
        driver.get('http://localhost:5173')

        # Wait for page to load
        time.sleep(2)

        # Capture initial console logs
        print("\n=== Initial Console Logs ===")
        logs = capture_console_logs(driver)
        for log in logs:
            print(f"{log['level']}: {log['message']}")

        # Take screenshot of login page
        driver.save_screenshot('/tmp/viewer_login.png')
        print("\nScreenshot saved to /tmp/viewer_login.png")

        # Get page source to check what's rendered
        print("\n=== Page Title ===")
        print(driver.title)

        # Login
        try:
            print("\nAttempting to login with admin/admin...")

            # Wait for login form to fully render
            time.sleep(2)

            # Find and fill login form
            inputs = driver.find_elements(By.TAG_NAME, 'input')
            print(f"Found {len(inputs)} input fields")

            if len(inputs) >= 3:
                # Clear and fill fields
                # Server URL (index 0) - should be pre-filled
                print(f"Server URL: {inputs[0].get_attribute('value')}")

                # Username (index 1)
                inputs[1].clear()
                inputs[1].send_keys('admin')
                print("Entered username: admin")

                # Password (index 2)
                inputs[2].clear()
                inputs[2].send_keys('admin')
                print("Entered password: admin")

                time.sleep(1)

                # Find and click Sign in button
                buttons = driver.find_elements(By.TAG_NAME, 'button')
                for button in buttons:
                    if 'Sign in' in button.text:
                        print("Clicking Sign in button...")
                        button.click()
                        break

                # Wait longer for login to complete
                print("Waiting for login response...")
                time.sleep(5)

                # Check current state
                print(f"\nCurrent URL after login: {driver.current_url}")

                # Check if still on login page (login failed) or navigated (success)
                current_body_text = driver.find_element(By.TAG_NAME, 'body').text[:200]

                if 'Sign in to XNAT' in current_body_text:
                    print("\n❌ Still on login page - authentication failed")
                    print("This is expected if the demo server is unavailable")

                    # Capture console errors
                    print("\n=== Console Errors After Login Attempt ===")
                    logs = capture_console_logs(driver)
                    for log in logs:
                        if log['level'] == 'SEVERE':
                            print(f"ERROR: {log['message']}")
                else:
                    print("\n✅ Login appears successful!")

                    # Try to navigate to projects
                    print("\nNavigating to projects...")
                    driver.get('http://localhost:5173/projects')
                    time.sleep(3)

                    # Take screenshot
                    driver.save_screenshot('/tmp/viewer_projects.png')
                    print("Screenshot saved to /tmp/viewer_projects.png")

                    # Try to find and click on first project
                    try:
                        # Look for project links
                        links = driver.find_elements(By.TAG_NAME, 'a')
                        project_links = [l for l in links if '/projects/' in l.get_attribute('href') or '']

                        if project_links:
                            print(f"\nFound {len(project_links)} project links")
                            print("Clicking first project...")
                            project_links[0].click()
                            time.sleep(2)

                            driver.save_screenshot('/tmp/viewer_project_detail.png')
                            print("Screenshot saved to /tmp/viewer_project_detail.png")
                    except Exception as e:
                        print(f"Could not navigate to project: {e}")

        except Exception as e:
            print(f"Error during login/navigation: {e}")

        # Final console logs
        print("\n=== Final Console Logs ===")
        logs = capture_console_logs(driver)
        for log in logs:
            print(f"{log['level']}: {log['message']}")

    finally:
        driver.quit()
        print("\nBrowser closed.")

if __name__ == '__main__':
    test_viewer()

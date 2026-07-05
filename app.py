import os
import time
import urllib.request
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template, request
from bs4 import BeautifulSoup

app = Flask(__name__)

CACHE_FILE = "feed_cache.xml"
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
CACHE_EXPIRY = 3600  # Cache for 1 hour

def fetch_feed_data(force=False):
    # Check if cache is valid and fresh
    if not force and os.path.exists(CACHE_FILE):
        mtime = os.path.getmtime(CACHE_FILE)
        if time.time() - mtime < CACHE_EXPIRY:
            print("Serving feed from cache (fresh)")
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                return f.read(), True

    # Attempt to fetch from the live URL
    print("Fetching live feed data from Google Cloud...")
    try:
        req = urllib.request.Request(
            FEED_URL,
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/xml,text/xml,*/*'
            }
        )
        # Timeout after 10 seconds to avoid hanging
        with urllib.request.urlopen(req, timeout=10) as response:
            data = response.read().decode('utf-8')
            # Write to cache file
            os.makedirs(os.path.dirname(CACHE_FILE) if os.path.dirname(CACHE_FILE) else '.', exist_ok=True)
            with open(CACHE_FILE, 'w', encoding='utf-8') as f:
                f.write(data)
            return data, False
    except Exception as e:
        print(f"Error fetching feed: {e}")
        # Fallback to cache even if expired if fetch fails
        if os.path.exists(CACHE_FILE):
            print("Fallback: serving expired feed cache due to fetch error")
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                return f.read(), True
        raise e

def parse_xml_to_json(xml_data):
    root = ET.fromstring(xml_data)
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    entries = root.findall('atom:entry', ns)
    parsed_entries = []
    
    for entry in entries:
        title_el = entry.find('atom:title', ns)
        id_el = entry.find('atom:id', ns)
        updated_el = entry.find('atom:updated', ns)
        link_el = entry.find('atom:link', ns)
        content_el = entry.find('atom:content', ns)
        
        entry_title = title_el.text if title_el is not None else "Unknown Date"
        entry_id = id_el.text if id_el is not None else ""
        entry_updated = updated_el.text if updated_el is not None else ""
        entry_link = link_el.attrib.get('href', '') if link_el is not None else ""
        content_html = content_el.text if content_el is not None else ""
        
        # Parse the HTML content to break it down into individual updates
        soup = BeautifulSoup(content_html, 'html.parser')
        updates = []
        current_type = "Update"  # Default type
        current_elements = []
        
        # Iterate over HTML elements to group by header (h3, h2, h4)
        for child in soup.contents:
            if child.name in ['h3', 'h2', 'h4']:
                # Save the preceding update group if not empty
                if current_elements:
                    html_content = "".join(str(el) for el in current_elements).strip()
                    text_content = "".join(el.get_text() if hasattr(el, 'get_text') else str(el) for el in current_elements).strip()
                    updates.append({
                        "type": current_type,
                        "html": html_content,
                        "text": text_content
                    })
                    current_elements = []
                current_type = child.get_text().strip()
            else:
                if str(child).strip():
                    current_elements.append(child)
                    
        # Append the final group
        if current_elements:
            html_content = "".join(str(el) for el in current_elements).strip()
            text_content = "".join(el.get_text() if hasattr(el, 'get_text') else str(el) for el in current_elements).strip()
            updates.append({
                "type": current_type,
                "html": html_content,
                "text": text_content
            })
            
        # Fallback if no specific headers were found but there is content
        if not updates and content_html.strip():
            updates.append({
                "type": "Update",
                "html": content_html,
                "text": soup.get_text().strip()
            })
            
        parsed_entries.append({
            "id": entry_id,
            "date": entry_title,
            "updated": entry_updated,
            "link": entry_link,
            "updates": updates
        })
        
    return parsed_entries

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/notes')
def get_notes():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    try:
        xml_data, from_cache = fetch_feed_data(force=force_refresh)
        notes = parse_xml_to_json(xml_data)
        return jsonify({
            "success": True,
            "from_cache": from_cache,
            "notes": notes
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == '__main__':
    # Start the server on port 5000
    app.run(debug=True, host='127.0.0.1', port=5000)

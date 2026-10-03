import os
import re

src_dir = r'F:\barvella\NextFrontend-Ecommerce\src'

def needs_use_client(content):
    """Check if file needs 'use client' directive"""
    patterns = [
        r'useEffect', r'useState', r'useRef', r'useNavigate',
        r'useLocation', r'useParams', r'useSearchParams',
        r'document\.', r'window\.', r'localStorage',
        r'onClick', r'onSubmit', r'onChange',
        r'createContext', r'useContext',
        r'useReducer', r'useCallback', r'useMemo',
        r'axios\.', r'socket\.io',
        r'export default function', r'export const',
    ]
    return any(re.search(p, content) for p in patterns)

def convert_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # 1. Replace import.meta.env with process.env
    content = content.replace('import.meta.env.VITE_API_URI', 'process.env.NEXT_PUBLIC_API_URI')
    
    # 2. Replace react-router-dom imports
    # First, extract the imports from react-router-dom
    rrd_pattern = r"import\s+\{([^}]+)\}\s+from\s+['\"]react-router-dom['\"]"
    match = re.search(rrd_pattern, content)
    if match:
        imports_str = match.group(1)
        items = [i.strip() for i in imports_str.split(',')]
        
        link_import = 'import Link from "next/link"' if 'Link' in items else ''
        other_items = [i for i in items if i != 'Link']
        
        # Handle NavLink -> we can use Link with className
        if 'NavLink' in other_items:
            other_items.remove('NavLink')
        
        nav_import = ''
        if other_items:
            # Map hook names (they're the same in next/navigation)
            hooks = ', '.join(other_items)
            nav_import = f'import {{ {hooks} }} from "next/navigation"'
        
        # Build replacement
        replacement = '\n'.join(filter(None, [link_import, nav_import]))
        content = re.sub(rrd_pattern, replacement, content)
    
    # Also handle single-quoted versions
    rrd_pattern2 = r"import\s+\{([^}]+)\}\s+from\s+['\"]react-router-dom['\"]"
    # Already handled above
    
    # Handle import Link from 'react-router-dom' (default import)
    content = re.sub(
        r"import\s+Link\s+from\s+['\"]react-router-dom['\"]",
        'import Link from "next/link"',
        content
    )
    
    # Handle import NavLink from 'react-router-dom'
    content = re.sub(
        r"import\s+NavLink\s+from\s+['\"]react-router-dom['\"]",
        'import Link from "next/link"',
        content
    )
    
    # Handle single quotes in general
    content = content.replace("from 'react-router-dom'", 'from "next/link"')
    
    # 3. Fix NavLink usage -> use Link (simple replacement)
    content = content.replace('<NavLink', '<Link')
    content = content.replace('</NavLink>', '</Link>')
    # Fix NavLink props - remove activeClassName etc.
    content = re.sub(r'activeClassName=\{[^}]+\}', '', content)
    
    # 4. Fix Outlet usage -> just a div placeholder
    content = content.replace('<Outlet />', '<div />')
    content = content.replace('<Outlet/>', '<div />')
    
    # 5. Add 'use client' if needed
    if needs_use_client(content) and not content.startswith("'use client'"):
        content = "'use client'\n" + content
    
    # 6. Replace useNavigate() calls with router.push()
    # (keep as is - useRouter().push() works the same as navigate())
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

count = 0
for root, dirs, files in os.walk(src_dir):
    for f in files:
        if f.endswith(('.jsx', '.js')):
            filepath = os.path.join(root, f)
            try:
                if convert_file(filepath):
                    count += 1
                    print(f"Converted: {os.path.relpath(filepath, src_dir)}")
            except Exception as e:
                print(f"Error: {filepath}: {e}")

print(f"\nTotal: {count} files converted")

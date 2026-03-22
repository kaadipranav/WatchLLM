import re
with open('app/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('import React, { useEffect, useRef } from "react";', 'import React, { useEffect, useRef, useState } from "react";')

hook_logic = """
  const [typedWord, setTypedWord] = useState('');
  const [wordIdx, setWordIdx] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  
  useEffect(() => {
    const words = ["USERS.", "ATTACKERS.", "ADVERSARIES.", "HACKERS.", "EVERYONE."];
    const currentWord = words[wordIdx];
    const typingSpeed = isDeleting ? 40 : 120;
    
    const timeout = setTimeout(() => {
      if (!isDeleting && typedWord === currentWord) {
        setTimeout(() => setIsDeleting(true), 2500);
      } else if (isDeleting && typedWord === '') {
        setIsDeleting(false);
        setWordIdx((wordIdx + 1) % words.length);
      } else {
        setTypedWord(currentWord.substring(0, typedWord.length + (isDeleting ? -1 : 1)));
      }
    }, typingSpeed);
    
    return () => clearTimeout(timeout);
  }, [typedWord, isDeleting, wordIdx]);
"""

text = text.replace('const termBodyRef = useRef<HTMLDivElement>(null);', 'const termBodyRef = useRef<HTMLDivElement>(null);\n' + hook_logic)

# Legacy hero markup (no longer present in app/page.tsx; script is archival)
old_h1 = '<h1 className="h1">LEGACY<br /><span className="line-accent">HERO</span><br />PLACEHOLDER</h1>'

new_h1 = """<h1 className="h1" style={{ fontSize: "clamp(3.5rem, 6.5vw, 6.2rem)", lineHeight: "1.05", marginBottom: "1.5rem" }}>
      BREAK YOUR<br />AGENTS BEFORE<br /><span className="line-blue" style={{ position: "relative" }}>
        {typedWord}<span style={{ position: "absolute", right: "-15px", borderRight: "0.08em solid var(--blue)", animation: "blink 1s steps(1) infinite", height: "80%", top: "10%" }}></span>
      </span>
    </h1>"""

text = text.replace(old_h1, new_h1)

with open('app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print('Done.')

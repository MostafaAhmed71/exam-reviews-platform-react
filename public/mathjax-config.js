// MathJax Configuration
// This file is loaded as an external script to avoid unsafe-inline in CSP

window.MathJax = {
  tex: {
    inlineMath: [['$', '$'], ['\\(', '\\)']],
    displayMath: [['$$', '$$'], ['\\[', '\\]']],
    processEscapes: true,
    processEnvironments: true,
    packages: {'[+]': ['textmacros', 'bidi']}
  },
  options: {
    skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre'],
    ignoreHtmlClass: 'tex2jax_ignore',
    processHtmlClass: 'tex2jax_process'
  },
  chtml: {
    fontURL: 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/output/chtml/fonts/woff-v2',
    mtextInheritFont: true
  },
  startup: {
    ready: () => {
      MathJax.startup.defaultReady();
      // Add CSS for Arabic text in MathJax with RTL support
      const style = document.createElement('style');
      style.textContent = `
        mjx-container {
          font-family: 'Cairo', Arial, sans-serif !important;
          direction: rtl !important;
          text-align: right !important;
        }
        mjx-container mjx-mtext {
          font-family: 'Cairo', Arial, sans-serif !important;
          direction: rtl !important;
          text-align: right !important;
          unicode-bidi: embed !important;
        }
        mjx-container[dir="rtl"] {
          direction: rtl !important;
        }
        mjx-container mjx-mtext[dir="rtl"] {
          direction: rtl !important;
        }
        /* Force RTL for all text elements in MathJax */
        mjx-container mjx-mtext {
          unicode-bidi: bidi-override !important;
          direction: rtl !important;
        }
      `;
      document.head.appendChild(style);
    }
  }
};


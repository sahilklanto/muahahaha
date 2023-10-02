 import { NextApiRequest, NextApiResponse } from 'next'
 
 import { NotionPage } from '@/components/NotionPage'
 import { domain, } from '@/lib/config'
 import { resolveNotionPage } from '@/lib/resolve-notion-page'
 
 import * as React from 'react'
 import ReactDOMServer from 'react-dom/server';
 import { IconContext } from '@react-icons/all-files'
 
 
 export default async (req: NextApiRequest, res: NextApiResponse) => {
 
   console.log('req query', req.query);
   const pageId: any = req.query;
   console.log('req page id', pageId);
   const rawPageId: any = pageId.notionPageId;
   console.log('req page id', rawPageId);

   const props = await resolveNotionPage(domain, rawPageId)
  console.log(props)
   return res.status(200).json(props);

   // trying to duplicate the functionality of _document.tsx
   const output = ReactDOMServer.renderToStaticMarkup(
     <>
       <IconContext.Provider value={{ style: { verticalAlign: 'middle' } }}>
           <body>
             <script
               dangerouslySetInnerHTML={{
                 __html: `
 /** Inlined version of noflash.js from use-dark-mode */
 ;(function () {
   var storageKey = 'darkMode'
   var classNameDark = 'dark-mode'
   var classNameLight = 'light-mode'
   function setClassOnDocumentBody(darkMode) {
     document.body.classList.add(darkMode ? classNameDark : classNameLight)
     document.body.classList.remove(darkMode ? classNameLight : classNameDark)
   }
   var preferDarkQuery = '(prefers-color-scheme: dark)'
   var mql = window.matchMedia(preferDarkQuery)
   var supportsColorSchemeQuery = mql.media === preferDarkQuery
   var localStorageTheme = null
   try {
     localStorageTheme = localStorage.getItem(storageKey)
   } catch (err) {}
   var localStorageExists = localStorageTheme !== null
   if (localStorageExists) {
     localStorageTheme = JSON.parse(localStorageTheme)
   }
   // Determine the source of truth
   if (localStorageExists) {
     // source of truth from localStorage
     setClassOnDocumentBody(localStorageTheme)
   } else if (supportsColorSchemeQuery) {
     // source of truth from system
     setClassOnDocumentBody(mql.matches)
     localStorage.setItem(storageKey, mql.matches)
   } else {
     // source of truth from document.body
     var isDarkMode = document.body.classList.contains(classNameDark)
     localStorage.setItem(storageKey, JSON.stringify(isDarkMode))
   }
 })();
 `
               }}
             />
             <NotionPage {...props} />
           </body>
       </IconContext.Provider>
     </>
   )
 
   res.setHeader(
     'Cache-Control',
     'public, s-maxage=60, max-age=60, stale-while-revalidate=60'
   )
   res.status(200).send(output);
 }
 

import { NextApiRequest, NextApiResponse } from 'next'

import * as types from '../../lib/types'
import { search } from '../../lib/notion'



import { GetStaticProps } from 'next'

import { NotionPage } from '@/components/NotionPage'
import { domain, isDev } from '@/lib/config'
import { getSiteMap } from '@/lib/get-site-map'
import { resolveNotionPage } from '@/lib/resolve-notion-page'
import { PageProps, Params } from '@/lib/types'

import * as React from 'react'
import ReactDOMServer from 'react-dom/server';
import Document, { Head, Html, Main, NextScript } from 'next/document'
import { IconContext } from '@react-icons/all-files'


export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).send({ error: 'method not allowed' })
  }

  const searchParams: types.SearchParams = req.body
  const pageId = req.body;
  const rawPageId = pageId.notionPageId;


  const props = await resolveNotionPage(domain, rawPageId)

  const output = ReactDOMServer.renderToStaticMarkup(
    <>
      <IconContext.Provider value={{ style: { verticalAlign: 'middle' } }}>
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
      </IconContext.Provider>
    </>
  )

  res.setHeader(
    'Cache-Control',
    'public, s-maxage=60, max-age=60, stale-while-revalidate=60'
  )
  res.status(200).send(output);
}

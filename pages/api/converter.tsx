import { NextApiRequest, NextApiResponse } from "next";
import { NotionAPI } from "notion-client";


import * as React from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'

import cs from 'classnames'
import { PageBlock } from 'notion-types'
import { formatDate, getBlockTitle, getPageProperty } from 'notion-utils'
import BodyClassName from 'react-body-classname'
import { NotionRenderer } from 'react-notion-x'
import TweetEmbed from 'react-tweet-embed'
import { useSearchParam } from 'react-use'

import * as config from '@/lib/config'
import * as types from '@/lib/types'
import { mapImageUrl } from '@/lib/map-image-url'
import { getCanonicalPageUrl, mapPageUrl } from '@/lib/map-page-url'
import { searchNotion } from '@/lib/search-notion'
import { useDarkMode } from '@/lib/use-dark-mode'

import { Footer } from '../../components/Footer'
import { GitHubShareButton } from '../../components/GitHubShareButton'
import { Loading } from '../../components/Loading'
import { NotionPageHeader } from '../../components/NotionPageHeader'
import { Page404 } from './../../components/Page404'
import { PageAside } from './../../components/PageAside'
import { PageHead } from './../../components/PageHead'
import styles from './../../components/styles.module.css'

import ReactDOMServer from 'react-dom/server';

const Code = dynamic(() =>
    import('react-notion-x/build/third-party/code').then(async (m) => {
        // add / remove any prism syntaxes here
        await Promise.allSettled([
            import('prismjs/components/prism-markup-templating.js'),
            import('prismjs/components/prism-markup.js'),
            import('prismjs/components/prism-bash.js'),
            import('prismjs/components/prism-c.js'),
            import('prismjs/components/prism-cpp.js'),
            import('prismjs/components/prism-csharp.js'),
            import('prismjs/components/prism-docker.js'),
            import('prismjs/components/prism-java.js'),
            import('prismjs/components/prism-js-templates.js'),
            import('prismjs/components/prism-coffeescript.js'),
            import('prismjs/components/prism-diff.js'),
            import('prismjs/components/prism-git.js'),
            import('prismjs/components/prism-go.js'),
            import('prismjs/components/prism-graphql.js'),
            import('prismjs/components/prism-handlebars.js'),
            import('prismjs/components/prism-less.js'),
            import('prismjs/components/prism-makefile.js'),
            import('prismjs/components/prism-markdown.js'),
            import('prismjs/components/prism-objectivec.js'),
            import('prismjs/components/prism-ocaml.js'),
            import('prismjs/components/prism-python.js'),
            import('prismjs/components/prism-reason.js'),
            import('prismjs/components/prism-rust.js'),
            import('prismjs/components/prism-sass.js'),
            import('prismjs/components/prism-scss.js'),
            import('prismjs/components/prism-solidity.js'),
            import('prismjs/components/prism-sql.js'),
            import('prismjs/components/prism-stylus.js'),
            import('prismjs/components/prism-swift.js'),
            import('prismjs/components/prism-wasm.js'),
            import('prismjs/components/prism-yaml.js')
        ])
        return m.Code
    })
)

const Collection = dynamic(() =>
    import('react-notion-x/build/third-party/collection').then(
        (m) => m.Collection
    )
)
const Equation = dynamic(() =>
    import('react-notion-x/build/third-party/equation').then((m) => m.Equation)
)
const Pdf = dynamic(
    () => import('react-notion-x/build/third-party/pdf').then((m) => m.Pdf),
    {
        ssr: false
    }
)
const Modal = dynamic(
    () =>
        import('react-notion-x/build/third-party/modal').then((m) => {
            m.Modal.setAppElement('.notion-viewport')
            return m.Modal
        }),
    {
        ssr: false
    }
)

const Tweet = ({ id }: { id: string }) => {
    return <TweetEmbed tweetId={id} />
}

const propertyLastEditedTimeValue = (
    { block, pageHeader },
    defaultFn: () => React.ReactNode
) => {
    if (pageHeader && block?.last_edited_time) {
        return `Last updated ${formatDate(block?.last_edited_time, {
            month: 'long'
        })}`
    }

    return defaultFn()
}

const propertyDateValue = (
    { data, schema, pageHeader },
    defaultFn: () => React.ReactNode
) => {
    if (pageHeader && schema?.name?.toLowerCase() === 'published') {
        const publishDate = data?.[0]?.[1]?.[0]?.[1]?.start_date

        if (publishDate) {
            return `${formatDate(publishDate, {
                month: 'long'
            })}`
        }
    }

    return defaultFn()
}

const propertyTextValue = (
    { schema, pageHeader },
    defaultFn: () => React.ReactNode
) => {
    if (pageHeader && schema?.name?.toLowerCase() === 'author') {
        return <b>{defaultFn()}</b>
    }

    return defaultFn()
}

export default async (req: NextApiRequest, res: NextApiResponse) => {
    const notionId = req.body;
    const notionAPI = new NotionAPI();
    console.log('bhai saab ', notionId.hello);

    const recordMap: any = notionAPI.getPage(notionId.notionId);
    const components = React.useMemo(
        () => ({
            nextImage: Image,
            nextLink: Link,
            Code,
            Collection,
            Equation,
            Pdf,
            Modal,
            Tweet,
            Header: NotionPageHeader,
            propertyLastEditedTimeValue,
            propertyTextValue,
            propertyDateValue
        }),
        []
    )
    // lite mode is for oembed
    const isLiteMode = 'true';
    const keys = Object.keys(recordMap?.block || {})
    const block = recordMap?.block?.[keys[0]]?.value

    const { isDarkMode } = useDarkMode()

    const showTableOfContents = true;
    const minTableOfContentsItems = 3;
    const isBlogPost = true;
    const router = useRouter()
    const lite = useSearchParam('lite')

    const pageAside = React.useMemo(
        () => (
            <PageAside block={block} recordMap={recordMap} isBlogPost={isBlogPost} />
        ),
        [block, recordMap, isBlogPost]
    )

    const footer = React.useMemo(() => <Footer />, [])

    if (router.isFallback) {
        return <Loading />
    }

  const socialImage = mapImageUrl(
    getPageProperty<string>('Social Image', block, recordMap) ||
      (block as PageBlock).format?.page_cover ||
      config.defaultPageCover,
    block
  )

  const socialDescription =
    getPageProperty<string>('Description', block, recordMap) ||
    config.description

    const title = getBlockTitle(block, recordMap);

    console.log('search params here ', notionId);

    const output = ReactDOMServer.renderToStaticMarkup(
        <>
        <PageHead
            pageId={''}
            site={{name: 'name', domain: 'domain', description: 'description', darkMode: false, rootNotionPageId: '', rootNotionSpaceId: ''}}
            title={title}
            description={socialDescription}
            image={socialImage}
            url={''}
        />

        {isLiteMode && <BodyClassName className='notion-lite' />}
        {isDarkMode && <BodyClassName className='dark-mode' />}

        <NotionRenderer
            bodyClassName={cs(
            styles.notion,
            )}
            darkMode={isDarkMode}
            components={components}
            recordMap={recordMap}
            rootPageId={'site.rootNotionPageId'}
            rootDomain={'site.domain'}
            fullPage={!isLiteMode}
            previewImages={!!recordMap.preview_images}
            showCollectionViewDropdown={false}
            showTableOfContents={showTableOfContents}
            minTableOfContentsItems={minTableOfContentsItems}
            defaultPageIcon={config.defaultPageIcon}
            defaultPageCover={config.defaultPageCover}
            defaultPageCoverPosition={config.defaultPageCoverPosition}
            mapImageUrl={mapImageUrl}
            searchNotion={config.isSearchEnabled ? searchNotion : null}
            pageAside={pageAside}
            footer={footer}
        />
        </>
    );

    console.log(res);
    res.status(200).send(output);
}
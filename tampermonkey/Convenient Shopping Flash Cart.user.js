// ==UserScript==
// @name         Convenient Shopping Flash Cart
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Convenient Shopping Flash Cart
// @author       Bhansali, Kaushal (bhansak@amazon.com)
// @include      https://www.amazon.*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=amazon.com
// @grant        GM_xmlhttpRequest
// @connect      bhansak.corp.amazon.com
// ==/UserScript==

(function() {
    'use strict';

    // Your code here...
    // Constants
    const AAPI_PROXY_ENDPOINT = 'http://bhansak.corp.amazon.com:5000' // http://bhansak.corp.amazon.com:5000 http://localhost:5000

    // CSS
    const addCSS = (css) => {
        document.head.appendChild(document.createElement("style")).innerHTML=css
    };

    addCSS(`
            .image-tooltip {
                position: fixed;
                display: inline-block;
            }
     
            .image-tooltip::after {
                content: attr(tooltipText);
                position: absolute;
                z-index: 10000;
                background-color: rgba(0, 0, 0, 0.8);
                color: #fff;
                padding: 5px;
                border-radius: 5px;
                overflow: visible; /* Make tooltip overflow visible */
                pointer-events: none; /* Prevent the tooltip from being interactive */
                opacity: 0;
                visibility: hidden;
                top: 50%;
                left: 110%;
                transform: translateY(-50%);
                white-space: pre-wrap; /* Allow line breaks */
                min-width: 150px;
                font-size: 12px;
                display: inline-block;
                max-width: 500px; /* Optional: Set maximum width for tooltip */
                transition: opacity 0.2s, visibility 0.2s;
            }
     
            .image-tooltip:hover::after {
                transition-delay: 2s;
                opacity: 1;
                visibility: visible;
                position: absolute;
                z-index: 10000;
                font-size: 12px;
                overflow: visible; /* Make tooltip overflow visible */
             }
     
             .image-tooltip:active::after {
                transition-delay: 2s;
                opacity: 1;
                visibility: visible;
                position: absolute;
                z-index: 10000;
                font-size: 12px;
                overflow: visible; /* Make tooltip overflow visible */
             }
     
            .image-container {
                position: relative;
                display: inline-block;
                margin: 20px;
            }
     
            .image-container:hover {
                cursor: pointer;
            }
     
            .image-container:active {
                cursor: pointer;
            }
     
            .round-image {
                width: 40px;
                height: 40px;
                border-radius: 0%;
                overflow: hidden;
            }
     
            .round-image:hover {
                transition-delay: 1s;
                border: 2px solid #808080;
                cursor: pointer;
                width: 60px;
                height: 60px;
                z-index: 1000;
            }
     
            .round-image:active {
                transition-delay: 1s;
                border: 2px solid #808080;
                cursor: pointer;
                width: 60px;
                height: 60px;
                z-index: 1000;
            }
     
            .price-tag {
                position: absolute;
                bottom: -20px;
                left: 50%;
                transform: translateX(-50%);
                padding: 5px 5px;
                overflow: hidden;
                white-space: nowrap;
            }
     
            .original-price-tag {
                color: #808080;
            }
        `)

    // Common functions

    // Sleep
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    // Creates a decoration node.
    const getDecorationId = (asin) => {
        return `flash-cart-decoration-${asin}`
    }

    // Extracts customer Id from the DOM.
    const getCustomerId = () => document.getElementsByName('oldCustomerId')[0].value;

    // Extracts session Id from the DOM.
    const getSessionId = () => document.cookie.match(/session\-id=[0-9\-]+/)[0].split("=")[1]

    // Extracts obfuscated marketplace Id from the DOM.
    const getObfMarketplaceId = () => document.body.innerHTML.match(/"marketplaceId":"([a-zA-Z0-9]+)"/)[1] ?? "ATVPDKIKX0DER"

    const currencyCodeToSymbolMap = {
        'CNY': '¥',
        'USD': '$',
        'INR': '₹'
    }

    const getInternationalizedVariationButtonValue = () => {
        if(document.location.toString().startsWith('https://www.amazon.cn')) {
            return "更换规格 ✎"
        }
        return "Change variant ✎"
    }

    const getInternationalizedSwitchingText = () => {
        if(document.location.toString().startsWith('https://www.amazon.cn')) {
            return "加载"
        }
        return "Switching"
    }

    // Fetches all AAPI variants.
    const getAsinVariants = async (
        asin
    ) => {
        const customerId = getCustomerId();
        const sessionId = getSessionId();
        const marketplaceId = getObfMarketplaceId();
        const apiEndpoint = `${AAPI_PROXY_ENDPOINT}/product/variations/${marketplaceId}/${asin}/${customerId}/${sessionId}`
        const response = await new Promise((resolve) => GM_xmlhttpRequest ({
            method: 'GET',
            url: apiEndpoint,
            onload: function (responseDetails) {
                resolve(JSON.parse(responseDetails.response))
            }
        }))

        return response;
    };

    // Feteches general ASIN details for the given ASIN.
    const getAsinGeneralDetails = async (
        asin
    ) => {
        const customerId = getCustomerId();
        const sessionId = getSessionId();
        const marketplaceId = getObfMarketplaceId();
        const apiEndpoint = `${AAPI_PROXY_ENDPOINT}/product/details/${marketplaceId}/${asin}/${customerId}/${sessionId}`
        const response = await new Promise((resolve) => GM_xmlhttpRequest ({
            method: 'GET',
            url: apiEndpoint,
            onload: function (responseDetails) {
                resolve(JSON.parse(responseDetails.response))
            }
        }))

        return response;
    };

    // Feteches general ASIN details for the given ASIN.
    const addAsinToCart = async (
        asin
    ) => {
        const customerId = getCustomerId();
        const sessionId = getSessionId();
        const marketplaceId = getObfMarketplaceId();
        const apiEndpoint = `${AAPI_PROXY_ENDPOINT}/add-to-cart/${marketplaceId}/${asin}/${customerId}/${sessionId}`
        const response = await new Promise((resolve, reject) => GM_xmlhttpRequest ({
            method: 'GET',
            url: apiEndpoint,
            onload: function (responseDetails) {
                if(responseDetails.status !== 200) {
                    throw new Error('Failed to add ASIN variant to cart', { responseDetails })
                    reject('Add to cart failed!')
                } else {
                    resolve(JSON.parse(responseDetails.response))
                }
            }
        }))

        return response;
    };

    // UI constructs

    // Creates a normal AUI button.
    const createAUINormalButton = (cta, id='') => {
        const newNode = document.createElement("span");
        newNode.setAttribute('class', 'a-button a-button-base a-spacing-micro a-button-small');
        newNode.setAttribute('id', id)

        const childNode = document.createElement("i");
        childNode.setAttribute('class', 'a-button-text a-text-center');
        childNode.innerText = cta

        newNode.appendChild(childNode)

        return newNode
    }

    // Prepares tooltip text from variant dimensions.
    const tooltipTextFromVariantDimensions = (variantDimensions) => {
        return (Object.keys(variantDimensions ?? {}).map((key) => `${key}: ${variantDimensions[key]}`).join('\n') ?? '...')
    }

    // Create a UI node for variational ASIN.
    const roundImageWithPrice = (imageURL, currentPrice, currencyCode, variantDimensions, originalPrice, clickHandler) => {
        // console.log({imageURL, currentPrice, currencySymbol, variantDimensions, originalPrice})
        const rootNode = document.createElement("span");
        rootNode.addEventListener('click', clickHandler);

        if(variantDimensions) {
            rootNode.setAttribute('class', 'image-container image-tooltip')
            rootNode.setAttribute('tooltipText', tooltipTextFromVariantDimensions(variantDimensions))
        } else {
            rootNode.setAttribute('class', 'image-container')
        }


        const imageNode = document.createElement("img");
        imageNode.setAttribute('src', imageURL)
        imageNode.setAttribute('class', 'round-image')
        rootNode.appendChild(imageNode)

        rootNode.appendChild(document.createElement("br"));

        const priceNode = document.createElement("div");
        priceNode.setAttribute('class', 'price-tag a-size-small a-text-bold')

        const currencySymbol = currencyCodeToSymbolMap[currencyCode] ?? currencyCode;
        if(originalPrice !== undefined){
            priceNode.innerHTML = `${currencySymbol}${currentPrice} <strike class='original-price-tag'>${currencySymbol}${originalPrice}</strike>`
        } else {
            priceNode.innerHTML = `${currencySymbol}${currentPrice}`
        }

        rootNode.appendChild(priceNode)

        return rootNode
    }

    const variantSwitchFeedback = async (fromAsin, toAsin, decorationId) => {
        const decorationNode = document.getElementById(decorationId)
        decorationNode.innerHTML = ""
        await decorationNode.appendChild(roundImageWithPrice(
            'https://upload.wikimedia.org/wikipedia/commons/c/c7/Loading_2.gif',
            getInternationalizedSwitchingText(),
            ''
        ))
    }


    // Re modelling constructs

    /**
     * Find and returns cart dom.
     */
    const extractCartItemsDom = () => {
        if (document.URL.toString().match(/https:\/\/www.amazon.*\/cart/)) {
            const results = Array.prototype.slice.call(document.getElementsByClassName('sc-list-item'))
            return results;
        }
        return []
    }

    /**
     * Extract ASIN from cart item dom.
     * @param dom Cart item dom.
     */
    const extractAsinFromCartDom = (dom) => {
        const result = dom.getAttribute('data-asin')
        return result
    }

    /**
     * Extract ASIN list from cart dom.
     * @param cartDom Cart dom.
     */
    const extractAsinsFromCartDomList = (cartDom) => {
        const results = cartDom.map((dom) => extractAsinFromCartDom(dom))
        return results
    }

    /**
     * Extract remove node from cart item dom.
     * @param itemDom Cart item dom.
     */
    const extractDeleteNodeFromCartItemDom = (itemDom) => {
        let deleteNode = Array.prototype.slice.call(itemDom.getElementsByClassName('a-color-link')).filter((dom) => (dom.name.startsWith('submit.delete') || dom.value === 'Delete'))[0]

        if(deleteNode === undefined) {
            // Handling case for mobile browser
            deleteNode = Array.prototype.slice.call(itemDom.getElementsByClassName('a-button-input')).filter((dom) => dom.name.startsWith('submit.delete'))[0]
        }

        return deleteNode
    }

    // Redecorates DOM with the variational ASINs.
    const itemVariantEditHandler = (asin, itemDom) => async (event) => {
        event.preventDefault()
        const decorationNode = document.getElementById(getDecorationId(asin))

        // CSS for variants
        decorationNode.style.overflowX = 'scroll'
        decorationNode.style.overflowY = 'visible'
        decorationNode.style.height = '100px'
        decorationNode.style.whiteSpace = 'nowrap'
        decorationNode.style.scrollbarWidth = 'thin'

        decorationNode.innerHTML = '';

        const asinVariants = await getAsinVariants(asin)
        // console.log({ asinVariants, variants: asinVariants?.variants })

        const deleteNode = extractDeleteNodeFromCartItemDom(itemDom)
        // console.log({ deleteNode })

        const selectVariantHandler = (variantAsin) => (event) => {
            // console.log("selectVariantHandler", { event })
            event.preventDefault();
            try {
                variantSwitchFeedback(asin, variantAsin, getDecorationId(asin))
                    .then(() => addAsinToCart(variantAsin))
                    .then(() => deleteNode.click())
            } catch (e) {
                console.error(e)
            }
        }

        asinVariants.variants.forEach((variant) => {
            const loadingNode = roundImageWithPrice(
                'https://upload.wikimedia.org/wikipedia/commons/c/c7/Loading_2.gif',
                '...',
                ''
            );
            decorationNode.appendChild(loadingNode);


            getAsinGeneralDetails(variant.asin).then((variantDetail) => {
                // console.log({ variant, variantDetail })
                if (['IN_STOCK', 'IN_STOCK_SCARCE', 'AVAILABLE_DATE'].includes(variantDetail.availability)) {
                    try {
                        decorationNode.replaceChild(roundImageWithPrice(
                            variantDetail.imageUrl,
                            variantDetail.amount,
                            variantDetail.currencyCode,
                            variant.dimensions,
                            undefined,
                            selectVariantHandler(variant.asin)
                        ), loadingNode)
                    } catch(e) {
                        console.error('Report error', { e })
                    }
                } else {
                    decorationNode.removeChild(loadingNode)
                    console.log(`REPORT UNAVAILABLE ${variantDetail.availability}`, { variant });
                }
            })
        })
    }

    /**
     * Decorates cart dom.
     * @param cartDom Cart dom.
     */
    const initialCartDomDecorator = (cartDom) => {
        cartDom.forEach(dom => {
            const asin = extractAsinFromCartDom(dom)

            // Cleanup
            const staleNode = document.getElementById(getDecorationId(asin))
            staleNode?.remove()

            // Setup
            const rootDecorationNode = document.createElement("div");
            rootDecorationNode.setAttribute('id', getDecorationId(asin))

            const changeVariantButton = createAUINormalButton(getInternationalizedVariationButtonValue())
            changeVariantButton.addEventListener('click', itemVariantEditHandler(asin, dom));
            rootDecorationNode.appendChild(changeVariantButton)

            const nodes = dom.getElementsByClassName('sc-product-variation')
            const node = nodes[nodes.length - 1]

            try {
                node.appendChild(rootDecorationNode);
            } catch(e) {
                console.error('Report error', { e })
            }
        })
    }

    // Logic
    const init = () => {
        const cartItemsDom = extractCartItemsDom()

        // Checks if re-dressing is required and init accordingly.
        console.log("cartItemsDom", { cartItemsDom })
        if(cartItemsDom.length === window.cartItemLength){
            return
        }

        window.cartItemLength = cartItemsDom.length

        const cartAsins = extractAsinsFromCartDomList(cartItemsDom)
        // console.log("Cart ASINs", { cartAsins })

        initialCartDomDecorator(cartItemsDom)
    }

    setInterval(init, 1000);

})();
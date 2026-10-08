export default async function({ addon, msg }) {
    const check = () => {
        if (document.querySelector('.interstitialViewModelButtonContainer, .ytp-error')) {
            const url = new URL(window.location.href);
            if (!url.searchParams.has('rco')) {
                url.searchParams.set('rco', '1');
                window.location.replace(url.toString());
            }
        }
    };

    const init = () => {
        const observer = new MutationObserver(check);
        observer.observe(document.body, { childList: true, subtree: true });
        check();
    };

    if (document.body) {
        init();
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }
}
import { projects } from './projects.js';

const DESKTOP_MQ = window.matchMedia('(min-width: 1025px)');
const isDesktop = () => DESKTOP_MQ.matches;

const projectSliders = [];

const getTokenPx = (name) =>
    parseInt(getComputedStyle(document.documentElement).getPropertyValue(name), 10);

function preloadFirstImage() {
    const src = projects[0]?.slides[0]?.images[0]?.src;
    if (!src) return;

    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = src;
    document.head.appendChild(link);
}

function getDisplaySlides(project) {
    if (isDesktop()) return project.slides;

    return project.slides.flatMap((slide) => {
        if (slide.layout === '2-stack' || slide.layout === '2-60vh') {
            return [slide];
        }
        return slide.images.map((img) => ({ layout: 1, images: [img] }));
    });
}

function renderImage(img, { immediate = false, priority = false } = {}) {
    const attrs = [`alt="${img.name}"`, 'decoding="async"'];

    if (immediate) {
        attrs.push(`src="${img.src}"`, 'loading="eager"');
        if (priority) attrs.push('fetchpriority="high"');
    } else {
        attrs.push(`data-src="${img.src}"`);
    }

    return `<img ${attrs.join(' ')}>`;
}

function getSlideImagesNames(slide) {
    if (!slide || !slide.images) return '';
    return slide.images.map((img) => img.name).filter(Boolean).join(', ');
}

function renderProjectSection(project, projectIndex) {
    const displaySlides = getDisplaySlides(project);
    const firstImageName = getSlideImagesNames(displaySlides[0]);

    const slidesHtml = displaySlides
        .map((slide, slideIndex) => {
            const imagesHtml = slide.images
                .map((img, imgIndex) => {
                    const immediate = projectIndex === 0 && slideIndex === 0;
                    const priority = immediate && imgIndex === 0;
                    return `
                        <div class="slide-item">
                            ${renderImage(img, { immediate, priority })}
                        </div>`;
                })
                .join('');

            const bgClass = slide.bg ? `bg-${slide.bg}` : '';
            return `
                <div class="slide layout-${slide.layout} ${bgClass}">
                    ${imagesHtml}
                </div>`;
        })
        .join('');

    const isFirstSlideBlack = displaySlides[0]?.bg === 'black';

    const section = document.createElement('section');
    section.className = 'project-section';
    section.id = `project-${projectIndex}`;
    section.innerHTML = `
        <div class="slider-area">
            <div class="slides-wrapper">${slidesHtml}</div>
        </div>
        <div class="project-details">
            <div class="pagination-dots ${isFirstSlideBlack ? 'bg-is-black' : ''}">
                ${displaySlides.map((_, i) => `<span class="dot ${i === 0 ? 'is-active' : ''}"></span>`).join('')}
            </div>
            ${project.title},
            <span class="image-name">${firstImageName}</span>,
            <span class="low-opacity">(${project.description})</span>
            ${project.link ? `<a href="${project.link}" target="_blank" rel="noopener noreferrer" class="external-link">${project.linkText}</a>` : ''}
        </div>`;

    initSlider(section, projectIndex, displaySlides);
    return section;
}

function initSlider(section, projectIndex, displaySlides) {
    const container = document.getElementById('portfolio-container');
    const sliderArea = section.querySelector('.slider-area');
    const wrapper = section.querySelector('.slides-wrapper');
    const nameDisplay = section.querySelector('.image-name');
    const dots = section.querySelectorAll('.dot');

    if (!sliderArea || !wrapper) return;

    let currentSlideIndex = 0;

    const goToSlide = (index) => {
        currentSlideIndex = index;
        const gap = getTokenPx('--slide-gap') || 0;
        const translation = currentSlideIndex * (window.innerWidth + gap);
        wrapper.style.transform = `translateX(-${translation}px)`;
        nameDisplay.textContent = getSlideImagesNames(displaySlides[currentSlideIndex]);
        dots.forEach((dot, i) => dot.classList.toggle('is-active', i === currentSlideIndex));

        const activeSlide = displaySlides[currentSlideIndex];
        const dotsContainer = section.querySelector('.pagination-dots');
        if (dotsContainer) {
            dotsContainer.classList.toggle('bg-is-black', activeSlide?.bg === 'black');
        }
    };

    const navigate = (direction) => {
        if (direction === 'next') {
            if (currentSlideIndex === displaySlides.length - 1) {
                goToSlide(0); // Boucle au début
            } else {
                goToSlide(currentSlideIndex + 1);
            }
        } else if (direction === 'prev') {
            if (currentSlideIndex === 0) {
                goToSlide(displaySlides.length - 1); // Boucle à la fin
            } else {
                goToSlide(currentSlideIndex - 1);
            }
        }
    };

    // Expose navigate function and translation updates for keyboard/resize controls
    projectSliders[projectIndex] = {
        navigate,
        goToSlide,
        updateTranslation: () => goToSlide(currentSlideIndex)
    };

    sliderArea.addEventListener('mousemove', (e) => {
        if (!isDesktop()) return;
        const isRightSide = e.clientX > window.innerWidth / 2;
        if (currentSlideIndex === displaySlides.length - 1 && isRightSide) {
            const scrollCursor = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='30' viewBox='0 0 240 30'><text x='10' y='20' font-family='AdobeClean, sans-serif' font-size='10' font-weight='bold' fill='%23ffffff' stroke='%23000000' stroke-width='0.4' letter-spacing='0.05em'>scroll%20down%20for%20next%20project</text></svg>") 10 15, auto`;
            sliderArea.style.cursor = scrollCursor;
        } else {
            sliderArea.style.cursor = isRightSide ? 'e-resize' : 'w-resize';
        }
    });

    sliderArea.addEventListener('click', (e) => {
        if (!isDesktop()) return;

        const isRightSide = e.clientX > window.innerWidth / 2;
        navigate(isRightSide ? 'next' : 'prev');
    });

    sliderArea.addEventListener('scroll', () => {
        if (isDesktop()) return;

        const index = Math.round(sliderArea.scrollLeft / sliderArea.clientWidth);
        dots.forEach((dot, i) => dot.classList.toggle('is-active', i === index));
        nameDisplay.textContent = getSlideImagesNames(displaySlides[index]);
        currentSlideIndex = index;

        const activeSlide = displaySlides[index];
        const dotsContainer = section.querySelector('.pagination-dots');
        if (dotsContainer) {
            dotsContainer.classList.toggle('bg-is-black', activeSlide?.bg === 'black');
        }
    });
}

const imagesToCrop = [
    'images/quete/QT-frontcover.webp',
    'images/quete/QT-logo-seri.webp',
    'images/francoteens/poster-detail.webp',
    'images/cdv25/carte-de-voeux.webp',
    'images/cdv25/print-details.webp',
    'images/napkey/napkey-instruments-logo.webp'
];

function loadSectionImages(section) {
    section.querySelectorAll('img[data-src]').forEach((img) => {
        const src = img.dataset.src;
        const shouldCrop = imagesToCrop.some(path => src.includes(path));
        if (shouldCrop) {
            img.classList.add('wide-crop');
        }
        img.src = src;
        img.loading = 'lazy';
        img.removeAttribute('data-src');
    });
}

function initSectionImageLoader(container) {
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                loadSectionImages(entry.target);
                observer.unobserve(entry.target);
            });
        },
        { root: container, rootMargin: '100% 0px' }
    );

    container.querySelectorAll('.project-section').forEach((section) => {
        if (section.querySelector('img[data-src]')) {
            observer.observe(section);
        }
    });
}

function buildIndex(projectList) {
    const indexList = document.querySelector('.index-list');
    if (!indexList) return;

    const itemsHtml = projectList
        .map((project, index) => {
            const num = index + 1;

            // Déterminer les collaborateurs pour desktop
            let collaboratorsHtml = '';
            if (project.id === 'aspect') {
                collaboratorsHtml = `with <a href="https://www.instagram.com/alexisnilias/" target="_blank" rel="noopener noreferrer">Alexis Nilias</a>, <a href="https://www.instagram.com/soline.bourdon/" target="_blank" rel="noopener noreferrer">Soline Bourdon</a>`;
            } else if (project.id === 'nike' || project.id === 'napkey' || project.id === 'gc' || project.id === 'francoteens') {
                collaboratorsHtml = `with <a href="https://midiquinze.com/" target="_blank" rel="noopener noreferrer">Midi:Quinze</a>`;
            }

            // Calculer le nombre total d'images
            const imageCount = project.slides.reduce((sum, slide) => sum + (slide.images ? slide.images.length : 0), 0);

            return `
                <div class="index-item" data-project-id="${project.id}">
                    <div class="index-client-wrapper">
                        <span class="index-num">${num}.</span>
                        <span class="index-client">${project.client}</span>
                    </div>
                    <div class="index-details-wrapper">
                        <span class="index-project">${project.project}</span>
                        <span class="index-year">${project.year}</span>
                    </div>
                    <div class="index-images-wrapper">
                        <span class="index-images-count">${imageCount} img.</span>
                    </div>
                    <div class="index-action-wrapper">
                        <span class="index-collab">${collaboratorsHtml}</span>
                        <span class="index-view-btn">view project</span>
                    </div>
                </div>
            `;
        })
        .join('');

    indexList.innerHTML = itemsHtml;
}

let isAboutOpen = false;
let openAbout = null;
let closeAbout = null;

function initMobileProjectObserver(container) {
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                entry.target.classList.toggle('is-active', entry.isIntersecting);

                if (!entry.isIntersecting) return;

                if (entry.target.id === 'about-section') {
                    document.body.classList.add('about-open');
                    isAboutOpen = true;
                    document.querySelectorAll('.index-item').forEach((item) => {
                        item.classList.remove('is-active');
                    });
                } else {
                    document.body.classList.remove('about-open');
                    isAboutOpen = false;
                    const projectIndex = entry.target.id.split('-')[1];
                    document.querySelectorAll('.index-item').forEach((item, i) => {
                        item.classList.toggle('is-active', i == projectIndex);
                    });
                }
            });
        },
        { root: container, threshold: 0.5 }
    );

    container.querySelectorAll('.project-section').forEach((section) => observer.observe(section));
}

function initIndexOverlay() {
    const indexBtn = document.querySelector('.index-btn');
    const indexOverlay = document.getElementById('index-overlay');
    const indexList = document.querySelector('.index-list');

    if (!indexOverlay || !indexBtn || !indexList) return;

    let isIndexOpen = false;

    const openIndex = () => {
        indexOverlay.classList.add('is-visible');
        isIndexOpen = true;
    };

    const closeIndex = () => {
        indexOverlay.classList.remove('is-visible');
        isIndexOpen = false;
    };

    const toggleIndex = (e) => {
        e?.preventDefault();

        if (!isIndexOpen) openIndex();
        else closeIndex();
    };

    indexBtn?.addEventListener('click', toggleIndex);

    indexList.addEventListener('click', (e) => {
        // Laisser les liens vers les collaborateurs fonctionner normalement
        if (e.target.tagName === 'A' || e.target.closest('a')) {
            return;
        }

        const item = e.target.closest('.index-item');
        if (!item) return;

        e.preventDefault();
        const projectId = item.getAttribute('data-project-id');
        const projectIndex = projects.findIndex(p => p.id === projectId);
        if (projectIndex !== -1) {
            const section = document.getElementById(`project-${projectIndex}`);
            if (section) {
                // Saut instantané au projet
                section.scrollIntoView({ behavior: 'auto' });
                closeIndex();

                // Fermer l'overview si elle est ouverte pour révéler le projet dessous
                const overviewOverlay = document.getElementById('overview-overlay');
                if (overviewOverlay && overviewOverlay.classList.contains('is-visible')) {
                    document.querySelector('.overview-btn')?.click();
                }
            }
        }
    });

    // Clic dans le vide -> fermer l'index
    document.addEventListener('click', (e) => {
        if (!isIndexOpen) return;

        const clickedIndexBtn = e.target.closest('.index-btn');
        const clickedIndexList = e.target.closest('.index-list');

        if (!clickedIndexBtn && !clickedIndexList) {
            closeIndex();
            e.preventDefault();
            e.stopPropagation();
        }
    }, true);
}

document.addEventListener('DOMContentLoaded', () => {
    preloadFirstImage();

    const container = document.getElementById('portfolio-container');
    if (!container) return;

    buildIndex(projects);

    projects.forEach((project, index) => {
        container.appendChild(renderProjectSection(project, index));
    });

    // Créer et ajouter la section About à la fin du conteneur de projets
    const aboutSection = document.createElement('section');
    aboutSection.id = 'about-section';
    aboutSection.className = 'project-section about-section';
    aboutSection.innerHTML = `
        <div class="about-grid">
            <!-- Row 1: About (Col 1-2) -->
            <div class="about-column about-bio-section">
                <h2 class="about-title">About</h2>
                <p class="about-p">I create unique graphic universes revolving around simple shapes and a high typographic rigor. I approach each project with a rational vision in order to produce minimalist and powerful concepts.</p>
                <p class="about-p">Based in Paris, I worked with the studio <a href="https://midiquinze.com/" target="_blank" rel="noopener noreferrer" class="about-link">Midi:Quinze↗&#xFE0E;</a>, and in an international agency with <a href="https://dragonrouge.com/" target="_blank" rel="noopener noreferrer" class="about-link">Dragon Rouge↗&#xFE0E;</a>. Since 2024, I have been developing <a href="https://www.instagram.com/aspect_wakemag/" target="_blank" rel="noopener noreferrer" class="about-link">Aspect Wakemag↗&#xFE0E;</a> as an art director.</p>
            </div>

            <!-- Row 1: Contact (Col 3-4) -->
            <div class="about-column about-contact-section">
                <h2 class="about-title">Get in touch</h2>
                <p class="about-p">Whether you are a company or an individual, feel free to contact me to schedule an appointment. We can discuss your project and agree together on the nature of our collaboration.</p>
                <div class="about-contact-details">
                    <div><span class="contact-label">tél.</span> <a href="tel:+33631386770" class="about-link">+33 631386770</a></div>
                    <div><span class="contact-label">mail.</span> <a href="mailto:work@ninogouy.fr" class="about-link">work@ninogouy.fr</a></div>
                    <div><span class="contact-label">instagram.</span> <a href="https://www.instagram.com/nino.gouv/" target="_blank" rel="noopener noreferrer" class="about-link">@nino.gouv</a></div>
                </div>
            </div>

            <!-- Row 2: Selected Clients (Col 1) -->
            <div class="about-column about-clients-section">
                <h2 class="about-title">Selected Clients</h2>
                <ul class="about-list">
                    <li>Apna</li>
                    <li>Artem’is</li>
                    <li>Aspect Wakeboard Mag</li>
                    <li>Cabourg Mon Amour</li>
                    <li>Courir</li>
                    <li>Fédération Fr. de Football</li>
                    <li>Guillaume Campredon</li>
                    <li>Miam Magazine</li>
                    <li>Napkey Instruments</li>
                    <li>Nike</li>
                    <li>Nike Football</li>
                    <li>Nike Tennis</li>
                    <li>Oreca Store</li>
                    <li>Pa’Cow Coworking</li>
                    <li>The Fat Broccoli</li>
                    <li>Yohan Nilias</li>
                </ul>
            </div>

            <!-- Row 2: Exhibitions & Publications (Col 2) -->
            <div class="about-column about-exhibitions-publications-section">
                <div class="about-subsection">
                    <h2 class="about-title">Exhibitions</h2>
                    <ul class="about-list">
                        <li><span class="about-year">2024</span><span class="about-event">Porto Design Biennale</span></li>
                        <li><span class="about-year">2025</span><span class="about-event">Musée d’histoires Naturelles de Paris</span></li>
                    </ul>
                </div>
                <div class="about-subsection">
                    <h2 class="about-title">Publications</h2>
                    <ul class="about-list">
                        <li><span class="about-year">2023</span><span class="about-event">Miam Magazine 10</span></li>
                        <li><span class="about-year">2024</span><span class="about-event">L’école du non savoir, Ruedi Baur</span></li>
                        <li><span class="about-year">2024</span><span class="about-event">Aspect Wake Magazine 1</span></li>
                        <li><span class="about-year">2025</span><span class="about-event">Aspect Wake Magazine 2</span></li>
                        <li><span class="about-year">2026</span><span class="about-event">Aspect Wake Magazine 3</span></li>
                    </ul>
                </div>
            </div>

            <!-- Row 2: Services (Col 3) -->
            <div class="about-column about-services-section">
                <h2 class="about-title">Services</h2>
                <ul class="about-list">
                    <li>Art Direction</li>
                    <li>Type Design</li>
                    <li>Illustration</li>
                    <li>Branding</li>
                    <li>Visual Identity</li>
                    <li>Packaging</li>
                    <li>Book Design</li>
                    <li>Editorial design</li>
                    <li>Website Design</li>
                    <li>Website Development</li>
                    <li>Signage</li>
                    <li>Print Support</li>
                </ul>
            </div>

            <!-- Row 2: Credits (Col 4) -->
            <div class="about-column about-credits-section">
                <h2 class="about-title">Credits</h2>
                <p class="about-p">Web design and development: Nino Gouy
                <br>©2026, all rights reserved</p>
            </div>
        </div>
    `;
    container.appendChild(aboutSection);

    loadSectionImages(container.querySelector('.project-section'));
    initSectionImageLoader(container);
    initMobileProjectObserver(container);
    initIndexOverlay();
    initOverviewOverlay(projects);
    initKeyboardNavigation();
    initDetailsScrollFade();
    initIntroOverlay();
    initAboutOverlay();
});

function getActiveProjectIndex() {
    const container = document.getElementById('portfolio-container');
    if (!container) return 0;
    const sections = container.querySelectorAll('.project-section');
    let activeIndex = 0;
    let minDistance = Infinity;

    sections.forEach((section, index) => {
        const dist = Math.abs(section.getBoundingClientRect().top);
        if (dist < minDistance) {
            minDistance = dist;
            activeIndex = index;
        }
    });

    return activeIndex;
}

function initIntroOverlay() {
    const intro = document.getElementById('intro-overlay');
    if (!intro) return;

    const introImages = [
        'images/loading-screen/artemis-envelope-close-up.webp',
        'images/loading-screen/aspect-keychain.webp',
        'images/loading-screen/gc-backcover.webp',
        'images/loading-screen/lgd-car-freshener.webp',
        'images/loading-screen/nap-tshirt.webp',
        'images/loading-screen/QUETE 1.webp',
        'images/loading-screen/sp26.webp'
    ];

    // Précharger les images de l'animation d'intro
    introImages.forEach(src => {
        const img = new Image();
        img.src = src;
    });

    // Animer l'enchaînement d'images
    const imgEl = document.getElementById('intro-anim-img');
    let introIntervalId = null;
    if (imgEl) {
        let currentIndex = 0;
        introIntervalId = setInterval(() => {
            currentIndex = (currentIndex + 1) % introImages.length;
            imgEl.src = introImages[currentIndex];
        }, 180);
    }

    // Générer l'écriture lettre par lettre
    const branding = document.getElementById('intro-branding');
    if (branding) {
        const text = "Nino is an independent graphic designer.";
        branding.innerHTML = text
            .split('')
            .map((char, index) => {
                const displayChar = char === ' ' ? '&nbsp;' : char;
                const delay = (index * 0.035).toFixed(3); // 35ms par lettre
                return `<span class="intro-char" style="animation-delay: ${delay}s">${displayChar}</span>`;
            })
            .join('');
    }

    let dismissed = false;

    const dismissIntro = () => {
        if (dismissed) return;
        dismissed = true;
        
        if (introIntervalId) {
            clearInterval(introIntervalId);
        }
        
        intro.classList.add('is-hidden');

        // Nettoyage des événements
        document.removeEventListener('click', dismissIntro);
        document.removeEventListener('wheel', dismissIntro);
        document.removeEventListener('touchmove', dismissIntro);
        const container = document.getElementById('portfolio-container');
        if (container) {
            container.removeEventListener('scroll', dismissIntro);
        }
    };


    // Fermeture immédiate au clic ou au défilement
    document.addEventListener('click', dismissIntro);
    document.addEventListener('wheel', dismissIntro);
    document.addEventListener('touchmove', dismissIntro);
    const container = document.getElementById('portfolio-container');
    if (container) {
        container.addEventListener('scroll', dismissIntro);
    }
}



function initAboutOverlay() {
    const navBtn = document.querySelector('.nav-btn');
    const aboutOverlay = document.getElementById('about-overlay');
    const closeBtn = document.querySelector('.about-close-btn');

    let isAboutOverlayOpen = false;

    openAbout = () => {
        if (aboutOverlay) {
            aboutOverlay.classList.add('is-visible');
            document.body.classList.add('about-open');
            isAboutOverlayOpen = true;
        }
    };

    closeAbout = () => {
        if (isAboutOverlayOpen) {
            if (aboutOverlay) {
                aboutOverlay.classList.remove('is-visible');
            }
            document.body.classList.remove('about-open');
            isAboutOverlayOpen = false;
        } else {
            // Défiler vers Legendre (le dernier projet)
            const lastProjectIndex = projects.length - 1;
            const lastProjectSection = document.getElementById(`project-${lastProjectIndex}`);
            if (lastProjectSection) {
                lastProjectSection.scrollIntoView({ behavior: 'smooth' });
            }
        }
    };

    navBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        openAbout();
    });

    closeBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeAbout();
    });
}

function initKeyboardNavigation() {
    const container = document.getElementById('portfolio-container');
    
    window.addEventListener('keydown', (e) => {
        const indexOverlay = document.getElementById('index-overlay');
        const overviewOverlay = document.getElementById('overview-overlay');
        if ((indexOverlay && indexOverlay.classList.contains('is-visible')) ||
            (overviewOverlay && overviewOverlay.classList.contains('is-visible'))) {
            return;
        }

        const activeIndex = getActiveProjectIndex();

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (activeIndex > 0) {
                container.children[activeIndex - 1]?.scrollIntoView({ behavior: 'smooth' });
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (activeIndex < projects.length - 1) {
                container.children[activeIndex + 1]?.scrollIntoView({ behavior: 'smooth' });
            }
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            projectSliders[activeIndex]?.navigate('prev');
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            projectSliders[activeIndex]?.navigate('next');
        }
    });
}

function initDetailsScrollFade() {
    const container = document.getElementById('portfolio-container');
    if (!container) return;

    const sections = container.querySelectorAll('.project-section');
    
    const updateDetails = () => {
        const height = window.innerHeight;
        const fadeDistance = height * 0.4; // Tolérance de 40% de la hauteur de l'écran

        sections.forEach((section) => {
            const details = section.querySelector('.project-details');
            const dots = section.querySelector('.pagination-dots');
            if (!details) return;

            const rect = section.getBoundingClientRect();
            const absD = Math.abs(rect.top);

            if (absD < fadeDistance) {
                const progress = absD / fadeDistance;
                const opacityVal = Math.max(0, 1 - progress).toFixed(3);
                const translateY = (-progress * 15).toFixed(1);

                details.style.opacity = opacityVal;
                details.style.transform = `translate3d(0, ${translateY}px, 0)`;
                details.style.pointerEvents = opacityVal > 0.1 ? 'auto' : 'none';

                if (dots) {
                    dots.style.opacity = opacityVal;
                    dots.style.transform = `translate3d(0, ${translateY}px, 0)`;
                    dots.style.pointerEvents = opacityVal > 0.1 ? 'auto' : 'none';
                }
            } else {
                details.style.opacity = '0';
                details.style.pointerEvents = 'none';
                if (dots) {
                    dots.style.opacity = '0';
                    dots.style.pointerEvents = 'none';
                }
            }
        });
    };

    container.addEventListener('scroll', updateDetails, { passive: true });
    updateDetails();
    window.addEventListener('resize', updateDetails);

    // Global resize handler to realign horizontal slides
    window.addEventListener('resize', () => {
        if (!isDesktop()) return;
        projectSliders.forEach((slider) => {
            slider?.updateTranslation();
        });
    });
}

function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function buildOverview(projectList) {
    const grid = document.querySelector('.overview-grid');
    if (!grid) return;

    const allSlides = [];
    projectList.forEach((project, projectIndex) => {
        project.slides.forEach((slide, slideIndex) => {
            allSlides.push({
                project,
                projectIndex,
                slide,
                slideIndex
            });
        });
    });

    const shuffled = shuffleArray(allSlides);
    const aspect = (window.innerWidth / window.innerHeight).toFixed(4);

    const cardsHtml = shuffled.map(({ project, projectIndex, slide, slideIndex }) => {
        const imagesHtml = slide.images.map(img => {
            return `<img src="${img.src}" alt="${img.name || ''}" loading="lazy">`;
        }).join('');

        const imageNames = slide.images.map(img => img.name).filter(Boolean).join(', ');
        const labelText = `${project.title} / ${imageNames}`;

        return `
            <div class="overview-card" data-project-index="${projectIndex}" data-slide-index="${slideIndex}">
                <div class="overview-block overview-layout-${slide.layout} bg-${slide.bg || 'white'}" style="aspect-ratio: ${aspect};">
                    ${imagesHtml}
                </div>
                <div class="overview-label">${labelText}</div>
            </div>`;
    }).join('');

    grid.innerHTML = cardsHtml;
}

function initOverviewOverlay(projectList) {
    const overviewBtn = document.querySelector('.overview-btn');
    const overviewOverlay = document.getElementById('overview-overlay');

    if (!overviewBtn || !overviewOverlay) return;

    let isOverviewOpen = false;

    buildOverview(projectList);

    // Mettre à jour le ratio d'affichage à chaque redimensionnement d'écran
    window.addEventListener('resize', () => {
        const aspect = (window.innerWidth / window.innerHeight).toFixed(4);
        document.querySelectorAll('.overview-block').forEach((block) => {
            block.style.aspectRatio = aspect;
        });
    });

    const setOverviewState = (open) => {
        isOverviewOpen = open;
        overviewBtn.textContent = open ? 'single view' : 'overview';
        if (open) {
            overviewOverlay.classList.add('is-visible');
        } else {
            overviewOverlay.classList.remove('is-visible');
        }
    };

    const toggleOverview = (e) => {
        e?.preventDefault();

        setOverviewState(!isOverviewOpen);
    };

    overviewBtn.addEventListener('click', toggleOverview);

    // Clic sur une carte d'overview pour naviguer
    overviewOverlay.addEventListener('click', (e) => {
        const card = e.target.closest('.overview-card');
        if (!card) return;

        const projectIndex = parseInt(card.getAttribute('data-project-index'), 10);
        const slideIndex = parseInt(card.getAttribute('data-slide-index'), 10);

        if (!isNaN(projectIndex) && !isNaN(slideIndex)) {
            // Masquer l'overview
            setOverviewState(false);

            // Saut vertical immédiat
            const section = document.getElementById(`project-${projectIndex}`);
            if (section) {
                section.scrollIntoView({ behavior: 'auto' });
            }

            // Saut horizontal immédiat
            projectSliders[projectIndex]?.goToSlide(slideIndex);
        }
    });
}

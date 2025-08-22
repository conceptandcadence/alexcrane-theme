// /////////////////////////////////////////////////////////////////////////////////////////
// Shipping Motivator
// /////////////////////////////////////////////////////////////////////////////////////////

let root = document.querySelector(':root');
let campaign = document.querySelector('script[data-motivator-campaign]')
  ? document.querySelector('script[data-motivator-campaign]').innerHTML
  : false;
let cartMotivatorTemplate = document.querySelector(
  '.motivator-templates .cart-motivator',
)
  ? document.querySelector('.motivator-templates .cart-motivator').innerHTML
  : false;
let bannerTemplate = document.querySelector('.motivator-templates .site-banner')
  ? document.querySelector('.motivator-templates .site-banner')
  : false;
let bannerText = document.querySelector('.motivator-templates .site-banner')
  ? document.querySelector('.motivator-templates .site-banner').innerHTML
  : false;

// Banner

if (bannerTemplate) {
  document.querySelector('#shopify-section-header').prepend(bannerTemplate);
  console.log(`Banner Active`);
} else {
  root.style.setProperty('--site-banner-height', '0px');
  console.log(`No Qualifying Banner Found`);
}
window.motivator = {
  campaign: JSON.parse(campaign),
  settings: {
    initialized: false,
    validCampaign: false,
  },
  templates: {
    cart: cartMotivatorTemplate,
    banner: bannerText,
  },
  initialize: () => {
    if (motivator.settings.initialized) return;
    let cartMotivator = document.querySelector(
      '.rebuy-cart__motivator--widget',
    );
    if (motivator.campaign) {
      document.querySelector('body').classList.add('motivator--active');
    }
    if (cartMotivator && motivator.templates.cart) {
      cartMotivator.innerHTML = motivator.templates.cart;
      document.querySelector('.motivator-templates .cart-motivator').remove();
    }
    if (cartMotivator) {
      if (motivator.campaign.settings?.color_background) {
        cartMotivator.style.backgroundColor =
          motivator.campaign.settings?.color_background;
      }
      if (cartMotivator.querySelector('.cart-motivator__progress-meter-fill')) {
        cartMotivator.querySelector(
          '.cart-motivator__progress-meter-fill',
        ).style.backgroundColor = motivator.campaign.settings.color_progress;
      }
      if (cartMotivator.querySelector('.cart-motivator__goal-message')) {
        cartMotivator.querySelector(
          '.cart-motivator__goal-message',
        ).style.color = '#fff';
      }
      if (cartMotivator.querySelector('.cart-motivator__goal-message')) {
        cartMotivator.querySelector(
          '.cart-motivator__goal-message',
        ).style.backgroundColor = motivator.campaign.settings.color_progress;
      }
      if (cartMotivator.querySelector('.cart-motivator__progress-message')) {
        cartMotivator.querySelector(
          '.cart-motivator__progress-message',
        ).style.color = motivator.campaign.settings.color_text;
      }
      if (
        cartMotivator.querySelector('.cart-motivator__progress-marker-text')
      ) {
        cartMotivator.querySelector(
          '.cart-motivator__progress-marker-text',
        ).style.color = motivator.campaign.settings.color_text;
      }
      if (
        cartMotivator.querySelector(
          '.cart-motivator__progress-marker-completed',
        )
      ) {
        cartMotivator.querySelector(
          '.cart-motivator__progress-marker-completed',
        ).style.color = motivator.campaign.settings.color_text;
      }
      //document.querySelector('.rebuy-cart__motivator .rebuy-cart__flyout-recommendations').style.backgroundColor = motivator.campaign.settings.color_background;
    }

    motivator.settings.initialized = true;
    motivator.settings.validCampaign = true;
    console.log('Cart Motivator Initialized');
  },
  update: () => {
    if (!motivator.settings.initialized || !motivator.settings.validCampaign) {
      motivator.initialize();
    }

    let cartMotivator = document.querySelector(
      '.rebuy-cart__motivator--widget',
    );
    let cartValue = window.Rebuy.SmartCart.cart.total_price;
    let goal1Value = motivator.campaign?.goal1?.value
      ? motivator.campaign.goal1.value
      : -1;
    let goal2Value = motivator.campaign?.goal2?.value
      ? motivator.campaign.goal2.value
      : -1;
    let goal3Value = motivator.campaign?.goal3?.value
      ? motivator.campaign.goal3.value
      : -1;
    let goal1Width;
    let goal2Width;
    let goal3Width;
    let goal1Acheived = false;
    let goal2Acheived = false;
    let goal3Acheived = false;
    let largestGoal;
    let lastGoalAcheivedMessage = '';
    let largestGoalValue = Math.max(goal1Value, goal2Value, goal3Value);
    let progressPercentage = `${(cartValue / largestGoalValue) * 100}%`;
    let currentGoal;
    let goalMessage;
    let inProgress = true;

    if (motivator.campaign?.goal1) {
      if (cartValue < motivator.campaign.goal1.value) {
        currentGoal = motivator.campaign.goal1;
      }
      if (motivator.campaign.goal1.value <= cartValue) {
        goal1Acheived = true;
        lastGoalAcheivedMessage = motivator.campaign.goal1.message;
      }
      if (motivator.campaign.goal1.value === largestGoalValue) {
        largestGoal = motivator.campaign.goal1;
      }
      goal1Width = `${(goal1Value / largestGoalValue) * 100}%`;
    }

    if (motivator.campaign?.goal2) {
      if (
        cartValue < motivator.campaign.goal2.value &&
        cartValue >= motivator.campaign.goal1.value
      ) {
        currentGoal = motivator.campaign.goal2;
      }
      if (motivator.campaign.goal2.value <= cartValue) {
        goal2Acheived = true;
        lastGoalAcheivedMessage = motivator.campaign.goal2.message;
      }
      if (motivator.campaign.goal2.value === largestGoalValue) {
        largestGoal = motivator.campaign.goal2;
      }

      goal2Width = `${((goal2Value - goal1Value) / largestGoalValue) * 100}%`;
    }

    if (motivator.campaign?.goal3) {
      if (
        cartValue < motivator.campaign.goal3.value &&
        cartValue >= motivator.campaign.goal2.value
      ) {
        currentGoal = motivator.campaign.goal3;
      }
      if (motivator.campaign.goal3.value <= cartValue) {
        goal3Acheived = true;
        lastGoalAcheivedMessage = motivator.campaign.goal3.message;
      }
      if (motivator.campaign.goal3.value === largestGoalValue) {
        largestGoal = motivator.campaign.goal3;
      }
      goal3Width = `${((goal3Value - goal2Value) / largestGoalValue) * 100}%`;
    }
    if (cartMotivator.querySelector('.cart-motivator__progress-meter')) {
      if (largestGoalValue <= cartValue) {
        inProgress = false;
        cartMotivator
          .querySelector('.cart-motivator__progress-meter')
          .classList.remove('has-progress');
        cartMotivator
          .querySelector('.cart-motivator__progress-meter')
          .classList.add('completed');
      } else {
        cartMotivator
          .querySelector('.cart-motivator__progress-meter')
          .classList.add('has-progress');
        cartMotivator
          .querySelector('.cart-motivator__progress-meter')
          .classList.remove('completed');
      }
    }

    let progressMessage;
    let completeMessage;

    if (window.motivator.campaign) {
      progressMessage = window.motivator.campaign.settings.template;
      completeMessage = window.motivator.campaign.settings.complete;
    }

    if (currentGoal) {
      progressMessage = progressMessage.replace(
        '[MONEY]',
        slate.Currency.formatMoney(
          currentGoal.value - cartValue,
          theme.moneyFormat,
        ),
      );
      progressMessage = progressMessage.replace('[GOAL]', currentGoal.title);
    }

    if (cartMotivator.querySelector('.cart-motivator__progress-meter-fill')) {
      if (inProgress) {
        goalMessage = lastGoalAcheivedMessage;
        cartMotivator.querySelector(
          '.cart-motivator__progress-meter-fill',
        ).style.width = progressPercentage;
        cartMotivator.querySelector(
          '.cart-motivator__progress-meter-fill-text',
        ).innerHTML = progressPercentage;
        cartMotivator.querySelector(
          '.cart-motivator__progress-message',
        ).innerHTML = progressMessage;
      } else {
        goalMessage = largestGoal.message;
        cartMotivator.querySelector(
          '.cart-motivator__progress-message',
        ).innerHTML = completeMessage;
        cartMotivator.querySelector(
          '.cart-motivator__progress-meter-fill',
        ).style.width = '100%';
        cartMotivator.querySelector(
          '.cart-motivator__progress-meter-fill',
        ).style.backgroundColor = '#006AFF';
      }
    }
    if (motivator.campaign.settings?.use_banner) {
      if (
        cartValue > 0 &&
        document.querySelector('#shopify-section-header .site-banner')
      ) {
        if (inProgress) {
          document.querySelector(
            '#shopify-section-header .site-banner',
          ).innerHTML = progressMessage;
        } else {
          document.querySelector(
            '#shopify-section-header .site-banner',
          ).innerHTML = completeMessage;
        }
      } else {
        document.querySelector(
          '#shopify-section-header .site-banner',
        ).innerHTML = motivator.templates.banner;
      }
    }

    try {
      if (
        goal1Width &&
        cartMotivator.querySelectorAll('.marker--goal1').length > 0
      ) {
        cartMotivator.querySelector('.marker--goal1').style.width = goal1Width;
      }
      if (
        goal2Width &&
        cartMotivator.querySelectorAll('.marker--goal2').length > 0
      ) {
        cartMotivator.querySelector('.marker--goal2').style.width = goal2Width;
      }
      if (
        goal3Width &&
        cartMotivator.querySelectorAll('.marker--goal3').length > 0
      ) {
        cartMotivator.querySelector('.marker--goal3').style.width = goal3Width;
      }
      if (goal1Acheived) {
        if (document.querySelector('.marker--goal1')) {
          cartMotivator
            .querySelector('.marker--goal1')
            .classList.add('complete');
        }
        cartMotivator.querySelector('.cart-motivator__goal-message').innerHTML =
          goalMessage;
        cartMotivator
          .querySelector('.cart-motivator__goal-message')
          .classList.add('active');
      } else {
        if (document.querySelector('.marker--goal1')) {
          cartMotivator
            .querySelector('.marker--goal1')
            .classList.remove('complete');
        }
      }
      if (goal2Acheived) {
        if (document.querySelector('.marker--goal2')) {
          cartMotivator
            .querySelector('.marker--goal2')
            .classList.add('complete');
        }
        cartMotivator.querySelector('.cart-motivator__goal-message').innerHTML =
          goalMessage;
        cartMotivator
          .querySelector('.cart-motivator__goal-message')
          .classList.add('active');
      } else {
        if (document.querySelector('.marker--goal2')) {
          cartMotivator
            .querySelector('.marker--goal2')
            .classList.remove('complete');
        }
      }
      if (goal3Acheived) {
        if (document.querySelector('.marker--goal3')) {
          cartMotivator
            .querySelector('.marker--goal3')
            .classList.add('complete');
        }
        cartMotivator.querySelector('.cart-motivator__goal-message').innerHTML =
          goalMessage;
        cartMotivator
          .querySelector('.cart-motivator__goal-message')
          .classList.add('active');
      } else {
        if (document.querySelector('.marker--goal3')) {
          cartMotivator
            .querySelector('.marker--goal3')
            .classList.remove('complete');
        }
      }

      if (
        !document.querySelector('.rebuy-cart__motivator .primary-title') ||
        document.querySelector('.rebuy-cart__motivator .primary-title')
          .innerHTML === ''
      ) {
        if (cartMotivator.querySelector('.cart-motivator__goal-message')) {
          cartMotivator
            .querySelector('.cart-motivator__goal-message')
            .classList.remove('active');
        }
      }
      setTimeout(() => {
        // Hide our messaging if the rebuy offer isnt present or shipping
        if (
          !document.querySelector('.rebuy-cart__motivator .primary-title') ||
          document.querySelector('.rebuy-cart__motivator .primary-title')
            .innerHTML === ''
        ) {
          if (cartMotivator.querySelector('.cart-motivator__goal-message')) {
            cartMotivator
              .querySelector('.cart-motivator__goal-message')
              .classList.remove('active');
          }
        }
      }, '250');
    } catch (error) {
      console.error(error);
    }

    console.log('Cart Motivator Updated');
  },
};

function getNested(obj, ...args) {
  return args.reduce((obj, level) => obj && obj[level], obj);
}

function waitFor(test, callback) {
  let interval = setInterval(function () {
    if ('undefined' !== typeof test) {
      callback;
      clearInterval(interval);
    } else {
      setTimeout(function () {
        clearInterval(interval);
      }, 10000);
    }
  }, 10);
}

document.addEventListener('rebuy.productsChange', function (event) {
  waitFor(getNested(window, 'Rebuy', 'SmartCart', 'cart'), motivator.update());
  window.dispatchEvent(new Event('resize'));
  setTimeout(() => {
    window.dispatchEvent(new Event('resize'));
  }, '250');
});

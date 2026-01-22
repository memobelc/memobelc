export const imageSources = [
  { id: 1, uri: require('@/assets/collection_themes/1.jpg') },
  { id: 2, uri: require('@/assets/collection_themes/2.jpg') },
  { id: 3, uri: require('@/assets/collection_themes/3.jpg') },
  { id: 4, uri: require('@/assets/collection_themes/4.jpg') },
  { id: 5, uri: require('@/assets/collection_themes/5.jpg') },
  { id: 6, uri: require('@/assets/collection_themes/6.jpg') },
  { id: 7, uri: require('@/assets/collection_themes/7.jpg') },
  { id: 8, uri: require('@/assets/collection_themes/8.jpg') },
  { id: 9, uri: require('@/assets/collection_themes/9.jpg') },
  { id: 10, uri: require('@/assets/collection_themes/10.jpg') },
  { id: 11, uri: require('@/assets/collection_themes/11.jpg') },
  { id: 12, uri: require('@/assets/collection_themes/12.jpg') },
];

export const imageSourcesDeck = [
  { id: 1, uri: require('@/assets/deck_themes/1.jpg') },
  { id: 2, uri: require('@/assets/deck_themes/2.jpg') },
  { id: 3, uri: require('@/assets/deck_themes/3.jpg') },
  { id: 4, uri: require('@/assets/deck_themes/4.jpg') },
  { id: 5, uri: require('@/assets/deck_themes/5.jpg') },
  { id: 6, uri: require('@/assets/deck_themes/6.jpg') },
  { id: 7, uri: require('@/assets/deck_themes/7.jpg') },
  { id: 8, uri: require('@/assets/deck_themes/8.jpg') },
  { id: 9, uri: require('@/assets/deck_themes/9.jpg') },
  { id: 10, uri: require('@/assets/deck_themes/10.jpg') },
  { id: 11, uri: require('@/assets/deck_themes/11.jpg') },
  { id: 12, uri: require('@/assets/deck_themes/12.jpg') },
  { id: 13, uri: require('@/assets/deck_themes/13.jpg') },
  { id: 14, uri: require('@/assets/deck_themes/14.jpg') },
  { id: 15, uri: require('@/assets/deck_themes/15.jpg') },
  { id: 16, uri: require('@/assets/deck_themes/16.jpg') },
  { id: 17, uri: require('@/assets/deck_themes/17.jpg') },
  { id: 18, uri: require('@/assets/deck_themes/18.jpg') },
  { id: 19, uri: require('@/assets/deck_themes/19.jpg') },
  { id: 20, uri: require('@/assets/deck_themes/20.jpg') },
  { id: 21, uri: require('@/assets/deck_themes/21.jpg') },
];

interface ISetImageprops {
  image?: string | null;
}

export const setImageUrl = ({ image }: ISetImageprops) => {
  let imgSource;

  if (image && image.startsWith('ct_')) {
    const id = Number(image.split('_')[1]);
    imgSource =
      imageSources.find((img) => img.id === id)?.uri || imageSources[0].uri;
  } else if (image) {
    imgSource = { uri: image };
  } else {
    imgSource = imageSources[0].uri;
  }

  return imgSource;
};

export const setImageUrlDeck = ({ image }: ISetImageprops) => {
  let imgSource;

  if (image && image.startsWith('dt_')) {
    const id = Number(image.split('_')[1]);
    imgSource =
      imageSourcesDeck.find((img) => img.id === id)?.uri ||
      imageSourcesDeck[0].uri;
  } else if (image) {
    imgSource = { uri: image };
  } else {
    imgSource = imageSourcesDeck[0].uri;
  }

  return imgSource;
};

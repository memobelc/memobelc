import {
  useContext,
  createContext,
  type PropsWithChildren,
  useState,
} from 'react';

type card = {
  back: string;
  card_id: string;
  front: string;
  audio: string;
  last_reviewed: string;
  next_review: string;
};

type DefaultDeck = {
  _id: string;
  created_at: Date;
  image: string | null;
  name: string;
  pending_cards: number;
  total_cards: number;
  updated_at: Date;
};

type Deck = DefaultDeck & {
  cards: any[];
  review_cards: card[];
};

type Collection = DefaultDeck & {
  decks: Deck[];
  review_collections_cards: card[];
  classroom?: string | null;
  is_book_collection?: boolean;
  book_id?: string;
  book_titulo?: string;
};

type ProgressUpdate = {
  user_id: string;
  cards: {
    card_id: string;
    recall_level: 'easy' | 'good' | 'difficult' | 'i_dont_remember';
  }[];
};

export type IClassroom = {
  _id: string;
  collection: string;
  created_at: Date;
  decks: string[];
  guests: [];
  image: string;
  name: string;
  students: { name: string; email: string }[];
  teacher: string;
  updated_at: Date;
};

export type Chats = {
  _id: string;
  created_at: string;
  user_id: string;
  settings: {
    language_conversation: string;
  };
  history: {
    role: string;
    parts: {
      text: string;
    }[];
  }[];
};

const CollectionContext = createContext<{
  collections: Collection[] | null;
  currentCollection: Collection | null;
  currentDeck: Deck | null;
  progressUpdate: ProgressUpdate | null;
  currentClassroom: IClassroom | null;
  setCollections: React.Dispatch<React.SetStateAction<Collection[] | null>>;
  setCurrentCollection: React.Dispatch<React.SetStateAction<Collection | null>>;
  setCurrentDeck: React.Dispatch<React.SetStateAction<Deck | null>>;
  setProgressUpdate: React.Dispatch<
    React.SetStateAction<ProgressUpdate | null>
  >;
  setCurrentClassroom: React.Dispatch<React.SetStateAction<IClassroom | null>>;
}>({
  collections: null,
  currentCollection: null,
  currentDeck: null,
  progressUpdate: null,
  currentClassroom: null,
  setCollections: () => {},
  setCurrentCollection: () => {},
  setCurrentDeck: () => {},
  setProgressUpdate: () => {},
  setCurrentClassroom: () => {},
});

export function useCollection() {
  const value = useContext(CollectionContext);
  if (process.env.NODE_ENV !== 'production') {
    if (!value) {
      throw new Error(
        'useCollections must be wrapped in a <SessionProvider />',
      );
    }
  }

  return value;
}

export function CollectionProvider({ children }: PropsWithChildren) {
  const [collections, setCollections] = useState<Collection[] | null>(null);
  const [currentCollection, setCurrentCollection] = useState<Collection | null>(
    null,
  );

  const [currentDeck, setCurrentDeck] = useState<Deck | null>(null);

  const [progressUpdate, setProgressUpdate] = useState<ProgressUpdate | null>(
    null,
  );

  const [currentClassroom, setCurrentClassroom] = useState<IClassroom | null>(
    null,
  );

  return (
    <CollectionContext.Provider
      value={{
        collections,
        setCollections,
        currentCollection,
        setCurrentCollection,
        currentDeck,
        setCurrentDeck,
        progressUpdate,
        setProgressUpdate,
        currentClassroom,
        setCurrentClassroom,
      }}
    >
      {children}
    </CollectionContext.Provider>
  );
}

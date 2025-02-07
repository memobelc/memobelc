import {
  useContext,
  createContext,
  type PropsWithChildren,
  useState,
} from 'react';

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
};

type Collection = DefaultDeck & {
  decks: Deck[];
};

const CollectionContext = createContext<{
  collections: Collection[] | null;
  currentCollection: Collection | null;
  setCollections: React.Dispatch<React.SetStateAction<Collection[] | null>>;
  setCurrentCollection: React.Dispatch<React.SetStateAction<Collection | null>>;
}>({
  collections: null,
  currentCollection: null,
  setCollections: () => {},
  setCurrentCollection: () => {},
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

  // useEffect(() => {

  //     }
  // }, []);

  return (
    <CollectionContext.Provider
      value={{
        collections,
        setCollections,
        currentCollection,
        setCurrentCollection,
      }}
    >
      {children}
    </CollectionContext.Provider>
  );
}

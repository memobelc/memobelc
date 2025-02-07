import { useContext, createContext, type PropsWithChildren, useState } from 'react';

type collection = {
    _id: string,
    created_at: Date,
    decks: [],
    image: string | null,
    name: string,
    pending_cards: number,
    total_cards: number,
    updated_at: Date
}

const CollectionContext = createContext<{
    collections: collection[] | null,
    setCollections: React.Dispatch<React.SetStateAction<collection[] | null>>;
}>({
    collections: null,
    setCollections: () => {}
});


export function useCollection() {
    const value = useContext(CollectionContext);
        if (process.env.NODE_ENV !== 'production') {
            if (!value) {
                throw new Error('useCollections must be wrapped in a <SessionProvider />');
            }
        }
    
        return value;
}

export function CollectionProvider({ children }: PropsWithChildren) {
    const [collections, setCollections] = useState<collection[] | null>(null);


    // useEffect(() => {
        
    //     }
    // }, []); 

    return (
        <CollectionContext.Provider
            value={{
                collections,
                setCollections
            }}>
            {children}
        </CollectionContext.Provider>
    );
}
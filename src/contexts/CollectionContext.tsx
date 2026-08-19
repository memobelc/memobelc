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
  card_type?: 'text' | 'multiple_choice' | 'image';
  options?: string[];
  correct_index?: number | null;
  image?: string | null;
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
  students: { _id: string; name: string; email: string }[];
  teacher: string;
  updated_at: Date;
  user_role?: 'teacher' | 'student';
};

export type IQuestion = {
  _id: string;
  text: string;
  type: 'multiple_choice' | 'checkbox' | 'dropdown' | 'paragraph' | 'short_answer' | 'fill_in_blank';
  options: string[];
  correct_answer?: string | string[] | null;
  show_answer: boolean;
  points: number;
  activity_id: string;
  order: number;
};

export type IActivity = {
  _id: string;
  title: string;
  description: string;
  order: number;
  module_id: string;
  course_id: string;
  visible: boolean;
  scheduled_at: string | null;
  questions?: IQuestion[];
};

export type ILesson = {
  _id: string;
  title: string;
  video_url: string;
  video_type: 'youtube' | 'upload' | 'vimeo' | 'other';
  description: string;
  order: number;
  module_id: string;
  course_id: string;
  visible: boolean;
  scheduled_at: string | null;
};

export type ICourseModule = {
  _id: string;
  name: string;
  order: number;
  course_id: string;
  scheduled_at?: string | null;
  lessons?: ILesson[];
  activities?: IActivity[];
};

export type ICourse = {
  _id: string;
  name: string;
  description: string;
  classroom_id: string;
  teacher_id: string;
  has_content?: boolean;
  modules?: ICourseModule[];
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
  currentCourse: ICourse | null;
  setCollections: React.Dispatch<React.SetStateAction<Collection[] | null>>;
  setCurrentCollection: React.Dispatch<React.SetStateAction<Collection | null>>;
  setCurrentDeck: React.Dispatch<React.SetStateAction<Deck | null>>;
  setProgressUpdate: React.Dispatch<
    React.SetStateAction<ProgressUpdate | null>
  >;
  setCurrentClassroom: React.Dispatch<React.SetStateAction<IClassroom | null>>;
  setCurrentCourse: React.Dispatch<React.SetStateAction<ICourse | null>>;
}>({
  collections: null,
  currentCollection: null,
  currentDeck: null,
  progressUpdate: null,
  currentClassroom: null,
  currentCourse: null,
  setCollections: () => {},
  setCurrentCollection: () => {},
  setCurrentDeck: () => {},
  setProgressUpdate: () => {},
  setCurrentClassroom: () => {},
  setCurrentCourse: () => {},
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

  const [currentCourse, setCurrentCourse] = useState<ICourse | null>(null);

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
        currentCourse,
        setCurrentCourse,
      }}
    >
      {children}
    </CollectionContext.Provider>
  );
}

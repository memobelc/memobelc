/* eslint-disable prettier/prettier */
import React, {
  cloneElement,
  createContext,
  useContext,
  useState,
} from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { cn } from '@/lib/utils';

interface DropDownContextType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const DropDownContext = createContext<DropDownContextType | undefined>(
  undefined,
);

const DropDown = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = useState<boolean>(false);
  return (
    <DropDownContext.Provider value={{ open, setOpen }}>
      <View className="relative">{children}</View>
    </DropDownContext.Provider>
  );
};

const DropDownTrigger = ({ children }: any) => {
  const { setOpen } = useDropdown();
  return cloneElement(children, {
    onPress: () => setOpen((prev: any) => !prev),
  });
};

type DropDownContentTypes = {
  className?: string;
  children: React.ReactNode;
};

const DropDownContent = ({ className, children }: DropDownContentTypes) => {
  const { open } = useDropdown();
  return (
    <>
      {open && (
        <View
          className={cn(
            'min-w-[14rem] w-auto absolute right-5 flex gap-3 overflow-hidden rounded-md border border-border bg-background text-popover-foreground shadow-md  p-2 top-10 z-50 bg-white',
            className,
          )}
        >
          {children}
        </View>
      )}
    </>
  );
};

type DropDownLabelProps = {
  labelTitle: string;
};

const DropDownLabel = ({ labelTitle }: DropDownLabelProps) => {
  return (
    <Text className="text-xl font-semibold text-primary">{labelTitle}</Text>
  );
};

type DropDownItemProps = {
  children: React.ReactNode;
  className?: string;
  onPress?: () => void;
};

const DropDownItem = ({
  children,
  className,
  onPress,
}: DropDownItemProps & { onPress?: () => void }) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className={cn('p-2', className)}
    >
      {children}
    </TouchableOpacity>
  );
};

const DropDownItemSeparator = () => {
  return <View className="h-[1px] bg-border flex-1" />;
};
const useDropdown = () => {
  const context = useContext(DropDownContext);
  if (!context) {
    throw new Error('useDropdown must be used within a DropdownProvider');
  }
  return context;
};
export {
  DropDown,
  DropDownTrigger,
  DropDownContent,
  DropDownLabel,
  DropDownItemSeparator,
  DropDownItem,
  useDropdown,
};

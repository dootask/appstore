import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {Search} from "lucide-react";
import {type ChangeEvent, useState} from "react";
import {useTranslation} from "react-i18next";

interface AppSearchProps {
  onSearch: (keyword: string) => void;
}

export function AppSearch({ onSearch }: AppSearchProps) {
  const {t} = useTranslation();
  const [keyword, setKeyword] = useState("");

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setKeyword(value);
    onSearch(value);
  };

  const handleSearch = () => {
    onSearch(keyword);
  };
  return (
    <div className="relative w-full">
      <Input
        type="search"
        placeholder={t('app.search')}
        className="pr-10 w-full h-10 text-sm"
        value={keyword}
        onChange={handleInputChange}
      />
      <Button
        size="icon"
        variant="ghost"
        className="absolute right-0 top-0 h-full px-3 py-2 text-muted-foreground"
        onClick={handleSearch}
      >
        <Search />
        <span className="sr-only">搜索</span>
      </Button>
    </div>
  );
}

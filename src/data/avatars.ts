/** 60 curated avatar image URLs (DiceBear + realistic portrait placeholders). */
export const AVATAR_OPTIONS: { id: string; url: string; label: string }[] = Array.from(
  { length: 60 },
  (_, i) => {
    const n = i + 1;
    const styles = ["avataaars", "lorelei", "notionists", "micah", "adventurer", "open-peeps"];
    const style = styles[i % styles.length];
    return {
      id: `avatar-${n}`,
      label: `Avatar ${n}`,
      url: `https://api.dicebear.com/9.x/${style}/svg?seed=hireflow-${n}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`,
    };
  }
);

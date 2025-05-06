type NewCategoryFormProps = {
  showNewCategoryForm: boolean;
  newCategoryName: string;
  setNewCategoryName: (name: string) => void;
  handleCreateCategory: () => void;
};

export function NewCategoryForm({
  showNewCategoryForm,
  newCategoryName,
  setNewCategoryName,
  handleCreateCategory,
}: NewCategoryFormProps) {
  if (!showNewCategoryForm) return null;

  return (
    <div className="border rounded-md p-4 bg-muted/20 space-y-4">
      <h4 className="font-medium">Create New Category</h4>
      <div className="flex gap-2">
        <input
          type="text"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          placeholder="Category name"
          className="flex-1 px-3 py-2 border rounded-md text-sm"
        />
        <button
          onClick={handleCreateCategory}
          disabled={!newCategoryName.trim()}
          className="bg-primary text-primary-foreground px-3 py-2 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Create
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        After creating a category, drag and drop file types into it to organize
        your media.
      </p>
    </div>
  );
}

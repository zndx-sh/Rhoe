import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function AuthButton() {
  const { user, loading, signInWithGoogle, signOut } = useAuthContext();
  const { toast } = useToast();

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      toast({
        title: 'Sign in failed',
        description: 'Could not sign in with Google. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: 'Signed out',
        description: 'You have been signed out successfully.',
      });
    } catch (error) {
      toast({
        title: 'Sign out failed',
        description: 'Could not sign out. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <Button variant="outline" size="icon" disabled className="h-9 w-9">
        <Loader2 className="w-4 h-4 animate-spin" />
      </Button>
    );
  }

  if (user) {
    const initials = user.user_metadata?.full_name
      ?.split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase() || user.email?.[0]?.toUpperCase() || '?';

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-9 w-9 rounded-full">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user.user_metadata?.avatar_url} alt={user.user_metadata?.full_name || 'User'} />
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="flex items-center justify-start gap-2 p-2">
            <div className="flex flex-col space-y-1 leading-none">
              {user.user_metadata?.full_name && (
                <p className="font-medium">{user.user_metadata.full_name}</p>
              )}
              {user.email && (
                <p className="text-sm text-muted-foreground truncate">
                  {user.email}
                </p>
              )}
            </div>
          </div>
          <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={handleSignIn} className="gap-2">
      <LogIn className="w-4 h-4" />
      <span className="hidden sm:inline">Sign in</span>
    </Button>
  );
}

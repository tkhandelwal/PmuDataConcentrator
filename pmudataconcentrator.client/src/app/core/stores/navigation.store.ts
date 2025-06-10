import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

export interface Breadcrumb {
  label: string;
  url: string;
}

export interface NavigationState {
  sidenavOpen: boolean;
  expertMode: boolean;
  currentRoute: string;
  breadcrumbs: Breadcrumb[];
  recentViews: { route: string; timestamp: Date }[];
  favoriteViews: string[];
}

export const NavigationStore = signalStore(
  { providedIn: 'root' },
  withState<NavigationState>({
    sidenavOpen: true,
    expertMode: false,
    currentRoute: '',
    breadcrumbs: [],
    recentViews: [],
    favoriteViews: []
  }),
  withComputed((store) => ({
    currentBreadcrumb: computed(() =>
      store.breadcrumbs()[store.breadcrumbs().length - 1]
    ),
    hasFavorites: computed(() =>
      store.favoriteViews().length > 0
    ),
    isExpertRoute: computed(() => {
      const expertRoutes = ['/analytics', '/visualization/vr', '/visualization/ar'];
      return expertRoutes.some(route => store.currentRoute().startsWith(route));
    })
  })),
  withMethods((store) => {
    const router = inject(Router);

    return {
      toggleSidenav() {
        patchState(store, { sidenavOpen: !store.sidenavOpen() });
      },

      toggleExpertMode() {
        patchState(store, { expertMode: !store.expertMode() });
      },

      updateBreadcrumbs(router: Router) {
        const breadcrumbs: Breadcrumb[] = [];
        let route: ActivatedRoute | null = router.routerState.root;

        while (route) {
          if (route.snapshot.data['breadcrumb']) {
            const url = '/' + route.snapshot.url.map(segment => segment.path).join('/');
            breadcrumbs.push({
              label: route.snapshot.data['breadcrumb'],
              url: url
            });
          }
          route = route.firstChild; // Now this is properly typed
        }

        patchState(store, {
          breadcrumbs,
          currentRoute: router.url
        });

        // Add to recent views
        this.addToRecentViews(router.url);
      },

      addToRecentViews(route: string) {
        const recentViews = store.recentViews();
        const filtered = recentViews.filter(v => v.route !== route);
        const updated = [
          { route, timestamp: new Date() },
          ...filtered.slice(0, 9)
        ];

        patchState(store, { recentViews: updated });
      },

      addToFavorites(route: string) {
        const favorites = store.favoriteViews();
        if (!favorites.includes(route)) {
          patchState(store, {
            favoriteViews: [...favorites, route]
          });
        }
      },

      removeFromFavorites(route: string) {
        const favorites = store.favoriteViews();
        patchState(store, {
          favoriteViews: favorites.filter(f => f !== route)
        });
      }
    };
  })
);
